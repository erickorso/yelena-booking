import "server-only";

import { AppointmentService } from "@/services/appointmentService";
import { GoogleCalendarService } from "@/services/googleCalendarService";
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
import { evaluatePatientBooking } from "@/lib/appointments/patientBookingRules";
import { resolveClinicId } from "@/lib/clinic/constants";
import { logServer } from "@/lib/observability/logger";
import type { Appointment } from "@/types/domain";
import {
  enqueueBookingSideEffects,
  processOutboxBatch,
} from "@/application/processOutbox";
import { AdminOutboxRepository } from "@/repositories/firestore/AdminOutboxRepository";

export type BookAppointmentCommand = {
  actor: { uid: string; role: AuthRole; clinicId?: string | null };
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
  outboxEnqueued: boolean;
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
 * enqueue Calendar/mail on outbox (saga + retries via cron).
 */
export async function bookAppointment(
  cmd: BookAppointmentCommand,
): Promise<BookAppointmentResult> {
  const users = new AdminUserRepository();
  const { actor, patientId, specialistId, startsAt, endsAt, notes } = cmd;
  const clinicId = resolveClinicId(actor.clinicId);
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
  if (!isWithinSchedule(startsAt, endsAt, schedule)) {
    throw new BookAppointmentError("Outside specialist working hours", 400);
  }

  const scheduleTz = resolveScheduleTimezone(schedule);
  const repo = new AdminAppointmentRepository();
  const existing = await repo.list({ specialistId });
  const conflict = existing.some((a) => {
    if (a.status === "cancelled") return false;
    if (a.clinicId && a.clinicId !== clinicId) return false;
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
    clinicId,
  });

  await enqueueBookingSideEffects({
    clinicId,
    appointmentId: appointment.id,
  });

  // Inline drain for UX (Meet link / mail); cron retries leftovers.
  await processOutboxBatch(10);
  appointment = (await repo.getById(appointment.id)) ?? appointment;

  const outbox = new AdminOutboxRepository();
  const mailJob = await outbox.getById(`mail_${appointment.id}`);
  const googleSynced = Boolean(appointment.googleEventId);
  const mailSent = mailJob?.status === "done";
  const mailSkipped =
    mailJob?.status === "pending" || mailJob?.status === "processing"
      ? "queued"
      : mailJob?.status === "dead"
        ? mailJob.lastError
        : null;

  return {
    appointment,
    googleSynced,
    mailSent,
    mailSkipped,
    outboxEnqueued: true,
  };
}
