import { NextResponse } from "next/server";
import { isAuthError, requireAuth } from "@/lib/auth/requireAuth";
import { AdminAvailabilityRepository } from "@/repositories/firestore/AdminAvailabilityRepository";
import { AdminAppointmentRepository } from "@/repositories/firestore/AdminAppointmentRepository";
import { AdminUserRepository } from "@/repositories/firestore/AdminUserRepository";
import { AppointmentService } from "@/services/appointmentService";
import { enqueueMail, MailService } from "@/services/mailService";
import { GoogleCalendarService } from "@/services/googleCalendarService";
import { canActAsPatient } from "@/types/domain";
import {
  isWithinSchedule,
  resolveScheduleTimezone,
} from "@/lib/availability/defaultSlots";
import { formatGoogleDateTime } from "@/lib/availability/scheduleTimeZone";
import { evaluatePatientBooking } from "@/lib/appointments/patientBookingRules";
import { resolvePatientTimezone } from "@/lib/timezones";

interface CreateBody {
  patientId?: unknown;
  specialistId?: unknown;
  startsAt?: unknown;
  endsAt?: unknown;
  notes?: unknown;
}

function serialize(appointment: {
  id: string;
  patientId: string;
  specialistId: string;
  bookedById: string | null;
  startsAt: Date;
  endsAt: Date;
  status: string;
  notes: string | null;
  meetLink?: string | null;
  googleEventId?: string | null;
  rescheduledFromId?: string | null;
  rescheduledToId?: string | null;
  transfer: {
    status: string;
    toSpecialistId: string | null;
    fromSpecialistId: string | null;
  };
}) {
  return {
    id: appointment.id,
    patientId: appointment.patientId,
    specialistId: appointment.specialistId,
    bookedById: appointment.bookedById,
    startsAt: appointment.startsAt.toISOString(),
    endsAt: appointment.endsAt.toISOString(),
    status: appointment.status,
    notes: appointment.notes,
    meetLink: appointment.meetLink ?? null,
    googleEventId: appointment.googleEventId ?? null,
    rescheduledFromId: appointment.rescheduledFromId ?? null,
    rescheduledToId: appointment.rescheduledToId ?? null,
    transfer: {
      status: appointment.transfer.status,
      toSpecialistId: appointment.transfer.toSpecialistId,
      fromSpecialistId: appointment.transfer.fromSpecialistId,
    },
  };
}

/**
 * GET /api/appointments?as=patient|specialist
 */
export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;

  const url = new URL(request.url);
  const as = url.searchParams.get("as");
  const repo = new AdminAppointmentRepository();
  const service = new AppointmentService(repo);

  try {
    if (as === "specialist" && (auth.role === "especialista" || auth.role === "admin")) {
      const patientId = url.searchParams.get("patientId")?.trim();
      if (patientId) {
        const list = await service.list({ patientId });
        return NextResponse.json({ appointments: list.map(serialize) });
      }
      const list = await service.list({ specialistId: auth.uid });
      return NextResponse.json({ appointments: list.map(serialize) });
    }

    if (!canActAsPatient(auth.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const list = await service.list({ patientId: auth.uid });
    return NextResponse.json({ appointments: list.map(serialize) });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to list appointments";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/appointments
 * - Self-book: patientId === caller (paciente | especialista | admin)
 * - On behalf: active especialista/admin; specialistId must be caller's uid (unless admin)
 */
export async function POST(request: Request) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;

  let body: CreateBody;
  try {
    body = (await request.json()) as CreateBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const patientId =
    typeof body.patientId === "string" ? body.patientId.trim() : "";
  const specialistId =
    typeof body.specialistId === "string" ? body.specialistId.trim() : "";
  const startsAt =
    typeof body.startsAt === "string" ? new Date(body.startsAt) : null;
  const endsAt = typeof body.endsAt === "string" ? new Date(body.endsAt) : null;
  const notes = typeof body.notes === "string" ? body.notes : null;

  if (!patientId || !specialistId || !startsAt || !endsAt) {
    return NextResponse.json(
      { error: "patientId, specialistId, startsAt, endsAt are required" },
      { status: 400 },
    );
  }
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
    return NextResponse.json({ error: "Invalid dates" }, { status: 400 });
  }

  try {
    const users = new AdminUserRepository();
    const isSelf = patientId === auth.uid;

    if (isSelf) {
      if (!canActAsPatient(auth.role)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    } else {
      if (auth.role !== "especialista" && auth.role !== "admin") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (auth.role === "especialista") {
        const me = await users.getSpecialistByUserId(auth.uid);
        if (!me || me.status !== "active") {
          return NextResponse.json(
            { error: "Specialist must be active" },
            { status: 403 },
          );
        }
        if (specialistId !== auth.uid) {
          return NextResponse.json(
            { error: "Can only book patients with yourself as specialist" },
            { status: 403 },
          );
        }
      }
    }

    const specialist = await users.getSpecialistByUserId(specialistId);
    if (!specialist || specialist.status !== "active") {
      return NextResponse.json(
        { error: "Target specialist is not active" },
        { status: 400 },
      );
    }

    const patient = await users.getById(patientId);
    if (!patient || !canActAsPatient(patient.role)) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    const schedule = await new AdminAvailabilityRepository().getConfigOrDefault(
      specialistId,
    );
    const scheduleTz = resolveScheduleTimezone(schedule);
    if (!isWithinSchedule(startsAt, endsAt, schedule)) {
      return NextResponse.json(
        { error: "Outside specialist working hours" },
        { status: 400 },
      );
    }

    const repo = new AdminAppointmentRepository();
    const existing = await repo.list({ specialistId });
    const conflict = existing.some((a) => {
      if (a.status === "cancelled") return false;
      return startsAt < a.endsAt && a.startsAt < endsAt;
    });
    if (conflict) {
      return NextResponse.json(
        { error: "Slot already booked" },
        { status: 409 },
      );
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
      return NextResponse.json(
        { error: patientCheck.error, code: patientCheck.code },
        { status: 409 },
      );
    }

    const gcal = new GoogleCalendarService();
    try {
      if (await gcal.hasConflict(specialistId, startsAt, endsAt, scheduleTz)) {
        return NextResponse.json(
          { error: "Slot conflicts with Google Calendar" },
          { status: 409 },
        );
      }
    } catch {
      // If FreeBusy fails, continue with app-only conflict check.
    }

    const service = new AppointmentService(repo);
    let appointment = await service.book({
      patientId,
      specialistId,
      startsAt,
      endsAt,
      notes,
      bookedById: auth.uid,
    });

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
      console.error("[gcal] create event failed", err);
    }

    const specialistUser = await users.getById(specialistId);
    enqueueMail(() =>
      new MailService().sendAppointmentBooked({
        to: patient.email,
        patientName: patient.displayName,
        specialistName: specialistUser?.displayName ?? specialist.specialty,
        startsAt: appointment.startsAt,
        endsAt: appointment.endsAt,
        locale: patient.locale === "en" ? "en" : "es",
        meetLink: appointment.meetLink,
      }),
    );

    return NextResponse.json({
      ok: true,
      googleSynced,
      appointment: serialize(appointment),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create appointment";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
