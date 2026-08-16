import "server-only";

import { AppointmentService } from "@/services/appointmentService";
import { GoogleCalendarService } from "@/services/googleCalendarService";
import { MailService } from "@/services/mailService";
import { AdminAppointmentRepository } from "@/repositories/firestore/AdminAppointmentRepository";
import { AdminAvailabilityRepository } from "@/repositories/firestore/AdminAvailabilityRepository";
import { AdminUserRepository } from "@/repositories/firestore/AdminUserRepository";
import {
  canOperateClinic,
  hasCapability,
  type AuthRole,
} from "@/types/domain";
import {
  isWithinSchedule,
  resolveScheduleTimezone,
} from "@/lib/availability/defaultSlots";
import { formatGoogleDateTime } from "@/lib/availability/scheduleTimeZone";
import { evaluatePatientBooking } from "@/lib/appointments/patientBookingRules";
import { resolvePatientTimezone } from "@/lib/timezones";
import { logServer } from "@/lib/observability/logger";
import type { Appointment } from "@/types/domain";

export type BookAppointmentCommand = {
  actor: { uid: string; role: AuthRole };
  patientId: string;
  specialistId: string;
  startsAt: Date;
  endsAt: Date;
  notes: string | null;
  requestId?: string;
};

export type BookAppointmentResult = {
  appointment: Appointment;
  googleSynced: boolean;
  mailSent: boolean;
  mailSkipped: string | null;
};

export class BookAppointmentError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = "BookAppointmentError";
  }
}

/**
 * Use-case: validate authz + schedule + conflicts, persist booking,
 * then best-effort Google Calendar + Resend (see docs/ARCHITECTURE.md).
 */
export async function bookAppointment(
  cmd: BookAppointmentCommand,
): Promise<BookAppointmentResult> {
  const users = new AdminUserRepository();
  const { actor, patientId, specialistId, startsAt, endsAt, notes } = cmd;
  const isSelf = patientId === actor.uid;

  if (isSelf) {
    if (!hasCapability(actor.role, "book_self")) {
      throw new BookAppointmentError("Forbidden", 403);
    }
  } else {
    if (!hasCapability(actor.role, "book_on_behalf")) {
      throw new BookAppointmentError("Forbidden", 403);
    }
    if (actor.role === "especialista") {
      const me = await users.getSpecialistByUserId(actor.uid);
      if (!canOperateClinic(actor.role, me?.status)) {
        throw new BookAppointmentError("Specialist must be active", 403);
      }
      if (specialistId !== actor.uid) {
        throw new BookAppointmentError(
          "Can only book patients with yourself as specialist",
          403,
        );
      }
    }
  }

  const specialist = await users.getSpecialistByUserId(specialistId);
  if (!specialist || specialist.status !== "active") {
    throw new BookAppointmentError("Target specialist is not active", 400);
  }

  const patient = await users.getById(patientId);
  if (!patient || !hasCapability(patient.role, "book_self")) {
    throw new BookAppointmentError("Patient not found", 404);
  }

  const schedule = await new AdminAvailabilityRepository().getConfigOrDefault(
    specialistId,
  );
  const scheduleTz = resolveScheduleTimezone(schedule);
  if (!isWithinSchedule(startsAt, endsAt, schedule)) {
    throw new BookAppointmentError("Outside specialist working hours", 400);
  }

  const repo = new AdminAppointmentRepository();
  const existing = await repo.list({ specialistId });
  const conflict = existing.some((a) => {
    if (a.status === "cancelled") return false;
    return startsAt < a.endsAt && a.startsAt < endsAt;
  });
  if (conflict) {
    throw new BookAppointmentError("Slot already booked", 409);
  }

  const patientAppointments = await repo.list({ patientId });
  const patientCheck = await evaluatePatientBooking({
    patientAppointments,
    targetSpecialistId: specialistId,
    targetSpecialty: specialist.specialty,
    startsAt,
    endsAt,
    getSpecialty: async (id) =>
      (await users.getSpecialistByUserId(id))?.specialty ?? null,
  });
  if (!patientCheck.ok) {
    throw new BookAppointmentError(
      patientCheck.error,
      409,
      patientCheck.code,
    );
  }

  const gcal = new GoogleCalendarService();
  try {
    if (await gcal.hasConflict(specialistId, startsAt, endsAt, scheduleTz)) {
      throw new BookAppointmentError(
        "Slot conflicts with Google Calendar",
        409,
      );
    }
  } catch (err) {
    if (err instanceof BookAppointmentError) throw err;
    logServer("warn", "gcal_freebusy_failed", {
      requestId: cmd.requestId,
      specialistId,
    });
  }

  const service = new AppointmentService(repo);
  let appointment = await service.book({
    patientId,
    specialistId,
    startsAt,
    endsAt,
    notes,
    bookedById: actor.uid,
  });

  // Side-effects: best-effort (saga). Booking row is source of truth.
  let googleSynced = false;
  try {
    const patientTz = resolvePatientTimezone(patient.timezone);
    const patientLocal = `${formatGoogleDateTime(appointment.startsAt, patientTz)}–${formatGoogleDateTime(appointment.endsAt, patientTz).slice(11)} (${patientTz})`;
    const specialistLocal = `${formatGoogleDateTime(appointment.startsAt, scheduleTz)}–${formatGoogleDateTime(appointment.endsAt, scheduleTz).slice(11)} (${scheduleTz})`;
    const event = await gcal.createAppointmentEvent({
      specialistId,
      appointmentId: appointment.id,
      summary: `Thaydee Elena · ${patient.displayName}`,
      description: [
        notes?.trim() || null,
        `Paciente: ${patientLocal}`,
        `Especialista: ${specialistLocal}`,
      ]
        .filter(Boolean)
        .join("\n"),
      startsAt: appointment.startsAt,
      endsAt: appointment.endsAt,
      timeZone: scheduleTz,
      attendeeEmail: patient.email,
    });
    if (event) {
      googleSynced = true;
      appointment = await repo.updateFields(appointment.id, {
        googleEventId: event.eventId,
        googleCalendarId: event.calendarId,
        meetLink: event.meetLink,
      });
    }
  } catch (err) {
    logServer("error", "gcal_create_failed", {
      requestId: cmd.requestId,
      appointmentId: appointment.id,
      message: err instanceof Error ? err.message : "unknown",
    });
  }

  const specialistUser = await users.getById(specialistId);
  const mailResult = await new MailService().sendAppointmentBooked({
    to: patient.email,
    patientName: patient.displayName,
    specialistName: specialistUser?.displayName ?? specialist.specialty,
    startsAt: appointment.startsAt,
    endsAt: appointment.endsAt,
    locale: patient.locale === "en" ? "en" : "es",
    meetLink: appointment.meetLink,
  });

  const mailSent =
    mailResult.ok && !("skipped" in mailResult && mailResult.skipped);
  const mailSkipped =
    mailResult.ok && "skipped" in mailResult && mailResult.skipped
      ? mailResult.reason
      : null;

  if (!mailResult.ok) {
    logServer("error", "mail_booked_failed", {
      requestId: cmd.requestId,
      appointmentId: appointment.id,
      error: mailResult.error,
    });
  }

  return { appointment, googleSynced, mailSent, mailSkipped };
}
