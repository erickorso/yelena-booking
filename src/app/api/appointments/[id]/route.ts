import { NextResponse } from "next/server";
import { isAuthError, requireAuth } from "@/lib/auth/requireAuth";
import { denyUnlessActiveSpecialist } from "@/lib/auth/requireActiveSpecialist";
import { serializeAppointment } from "@/lib/api/serializeAppointment";
import {
  isWithinSchedule,
  resolveScheduleTimezone,
} from "@/lib/availability/defaultSlots";
import { formatGoogleDateTime } from "@/lib/availability/scheduleTimeZone";
import { resolvePatientTimezone } from "@/lib/timezones";
import { evaluatePatientBooking } from "@/lib/appointments/patientBookingRules";
import { AdminAppointmentRepository } from "@/repositories/firestore/AdminAppointmentRepository";
import { AdminAvailabilityRepository } from "@/repositories/firestore/AdminAvailabilityRepository";
import { AdminUserRepository } from "@/repositories/firestore/AdminUserRepository";
import { AppointmentService } from "@/services/appointmentService";
import { GoogleCalendarService } from "@/services/googleCalendarService";
import { canActAsSpecialist, type AuthRole } from "@/types/domain";

async function assertCanManage(
  auth: { uid: string; role: AuthRole },
  appt: { specialistId: string; patientId: string; bookedById: string | null },
) {
  if (auth.role === "admin") return;
  if (canActAsSpecialist(auth.role) && appt.specialistId === auth.uid) {
    const denied = await denyUnlessActiveSpecialist(auth.uid, auth.role);
    if (denied) throw new Error("FORBIDDEN");
    return;
  }
  if (appt.patientId === auth.uid || appt.bookedById === auth.uid) return;
  throw new Error("FORBIDDEN");
}

async function syncGoogleCreate(args: {
  specialistId: string;
  appointmentId: string;
  patientId: string;
  notes: string | null;
  startsAt: Date;
  endsAt: Date;
  scheduleTz: string;
}) {
  const gcal = new GoogleCalendarService();
  const users = new AdminUserRepository();
  const patient = await users.getById(args.patientId);
  if (!patient) return null;
  const patientTz = resolvePatientTimezone(patient.timezone);
  const patientLocal = `${formatGoogleDateTime(args.startsAt, patientTz)}–${formatGoogleDateTime(args.endsAt, patientTz).slice(11)} (${patientTz})`;
  const specialistLocal = `${formatGoogleDateTime(args.startsAt, args.scheduleTz)}–${formatGoogleDateTime(args.endsAt, args.scheduleTz).slice(11)} (${args.scheduleTz})`;
  return gcal.createAppointmentEvent({
    specialistId: args.specialistId,
    appointmentId: args.appointmentId,
    summary: `Thaydee Elena · ${patient.displayName}`,
    description: [
      args.notes?.trim() || null,
      `Paciente: ${patientLocal}`,
      `Especialista: ${specialistLocal}`,
    ]
      .filter(Boolean)
      .join("\n"),
    startsAt: args.startsAt,
    endsAt: args.endsAt,
    timeZone: args.scheduleTz,
    attendeeEmail: patient.email,
  });
}

/**
 * PATCH /api/appointments/[id]
 * Body: { status: "cancelled" } | { startsAt, endsAt } for move or ghost-rebook.
 */
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  let body: { status?: unknown; startsAt?: unknown; endsAt?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    const repo = new AdminAppointmentRepository();
    const service = new AppointmentService(repo);
    const current = await repo.getById(id);
    if (!current) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }
    await assertCanManage(auth, current);

    const gcal = new GoogleCalendarService();
    const schedule = await new AdminAvailabilityRepository().getConfigOrDefault(
      current.specialistId,
    );
    const scheduleTz = resolveScheduleTimezone(schedule);

    if (body.status === "cancelled") {
      const updated = await service.transitionStatus(id, "cancelled");
      if (current.googleEventId) {
        try {
          await gcal.deleteAppointmentEvent({
            specialistId: current.specialistId,
            eventId: current.googleEventId,
            calendarId: current.googleCalendarId,
          });
        } catch (err) {
          console.error("[gcal] delete event failed", err);
        }
      }
      return NextResponse.json({ ok: true, appointment: serializeAppointment(updated) });
    }

    if (typeof body.startsAt === "string" && typeof body.endsAt === "string") {
      const startsAt = new Date(body.startsAt);
      const endsAt = new Date(body.endsAt);
      if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
        return NextResponse.json({ error: "Invalid dates" }, { status: 400 });
      }
      if (!isWithinSchedule(startsAt, endsAt, schedule)) {
        return NextResponse.json(
          { error: "Outside specialist working hours" },
          { status: 400 },
        );
      }

      const existing = await repo.list({ specialistId: current.specialistId });
      const conflict = existing.some((a) => {
        if (a.id === id || a.status === "cancelled") return false;
        return startsAt < a.endsAt && a.startsAt < endsAt;
      });
      if (conflict) {
        return NextResponse.json(
          { error: "Slot already booked" },
          { status: 409 },
        );
      }

      const users = new AdminUserRepository();
      const specialistProfile = await users.getSpecialistByUserId(
        current.specialistId,
      );
      const patientAppointments = await repo.list({
        patientId: current.patientId,
      });
      const patientCheck = await evaluatePatientBooking({
        patientAppointments,
        targetSpecialistId: current.specialistId,
        targetSpecialty: specialistProfile?.specialty ?? "",
        startsAt,
        endsAt,
        excludeAppointmentId:
          current.status === "cancelled" ? null : id,
        getSpecialty: async (sid) =>
          (await users.getSpecialistByUserId(sid))?.specialty ?? null,
      });
      if (!patientCheck.ok) {
        return NextResponse.json(
          { error: patientCheck.error, code: patientCheck.code },
          { status: 409 },
        );
      }

      try {
        if (
          await gcal.hasConflict(
            current.specialistId,
            startsAt,
            endsAt,
            scheduleTz,
          )
        ) {
          return NextResponse.json(
            { error: "Slot conflicts with Google Calendar" },
            { status: 409 },
          );
        }
      } catch {
        // FreeBusy failure → app conflict check only.
      }

      if (current.status === "cancelled") {
        const { appointment } = await service.rebookFromCancelled(
          id,
          startsAt,
          endsAt,
          auth.uid,
        );
        let created = appointment;
        try {
          const event = await syncGoogleCreate({
            specialistId: current.specialistId,
            appointmentId: created.id,
            patientId: current.patientId,
            notes: current.notes,
            startsAt,
            endsAt,
            scheduleTz,
          });
          if (event) {
            created = await repo.updateFields(created.id, {
              googleEventId: event.eventId,
              googleCalendarId: event.calendarId,
              meetLink: event.meetLink,
            });
          }
        } catch (err) {
          console.error("[gcal] create event on rebook failed", err);
        }
        return NextResponse.json({
          ok: true,
          appointment: serializeAppointment(created),
          ghostId: id,
        });
      }

      let updated = await service.reschedule(id, startsAt, endsAt);

      if (current.googleEventId) {
        try {
          const patient = await users.getById(current.patientId);
          const patientTz = resolvePatientTimezone(patient?.timezone ?? null);
          const patientLocal = `${formatGoogleDateTime(startsAt, patientTz)}–${formatGoogleDateTime(endsAt, patientTz).slice(11)} (${patientTz})`;
          const specialistLocal = `${formatGoogleDateTime(startsAt, scheduleTz)}–${formatGoogleDateTime(endsAt, scheduleTz).slice(11)} (${scheduleTz})`;
          await gcal.updateAppointmentEvent({
            specialistId: current.specialistId,
            eventId: current.googleEventId,
            calendarId: current.googleCalendarId,
            startsAt,
            endsAt,
            timeZone: scheduleTz,
            description: [
              current.notes?.trim() || null,
              `Paciente: ${patientLocal}`,
              `Especialista: ${specialistLocal}`,
            ]
              .filter(Boolean)
              .join("\n"),
          });
        } catch (err) {
          console.error("[gcal] update event failed", err);
        }
      }

      updated = (await repo.getById(id)) ?? updated;
      return NextResponse.json({ ok: true, appointment: serializeAppointment(updated) });
    }

    return NextResponse.json(
      { error: "Provide status=cancelled or startsAt+endsAt" },
      { status: 400 },
    );
  } catch (error) {
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const message =
      error instanceof Error ? error.message : "Failed to update appointment";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
