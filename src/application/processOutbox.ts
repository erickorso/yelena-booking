import "server-only";

import { GoogleCalendarService } from "@/services/googleCalendarService";
import { MailService } from "@/services/mailService";
import { AdminAppointmentRepository } from "@/repositories/firestore/AdminAppointmentRepository";
import { AdminAvailabilityRepository } from "@/repositories/firestore/AdminAvailabilityRepository";
import { AdminOutboxRepository } from "@/repositories/firestore/AdminOutboxRepository";
import { AdminUserRepository } from "@/repositories/firestore/AdminUserRepository";
import { resolveScheduleTimezone } from "@/lib/availability/defaultSlots";
import { formatGoogleDateTime } from "@/lib/availability/scheduleTimeZone";
import { resolvePatientTimezone } from "@/lib/timezones";
import { logServer } from "@/lib/observability/logger";
import type { OutboxJob } from "@/types/domain/outbox";

export type ProcessOutboxResult = {
  processed: number;
  done: number;
  failed: number;
  dead: number;
};

async function handleGoogleSync(appointmentId: string): Promise<void> {
  const repo = new AdminAppointmentRepository();
  const users = new AdminUserRepository();
  const appointment = await repo.getById(appointmentId);
  if (!appointment) throw new Error("Appointment not found");
  if (appointment.googleEventId) return;

  const patient = await users.getById(appointment.patientId);
  if (!patient) throw new Error("Patient not found");

  const schedule = await new AdminAvailabilityRepository().getConfigOrDefault(
    appointment.specialistId,
  );
  const scheduleTz = resolveScheduleTimezone(schedule);
  const patientTz = resolvePatientTimezone(patient.timezone);
  const patientLocal = `${formatGoogleDateTime(appointment.startsAt, patientTz)}–${formatGoogleDateTime(appointment.endsAt, patientTz).slice(11)} (${patientTz})`;
  const specialistLocal = `${formatGoogleDateTime(appointment.startsAt, scheduleTz)}–${formatGoogleDateTime(appointment.endsAt, scheduleTz).slice(11)} (${scheduleTz})`;

  const event = await new GoogleCalendarService().createAppointmentEvent({
    specialistId: appointment.specialistId,
    appointmentId: appointment.id,
    summary: `Thaydee Elena · ${patient.displayName}`,
    description: [
      appointment.notes?.trim() || null,
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

  if (!event) {
    throw new Error("Google Calendar not connected or event not created");
  }

  await repo.updateFields(appointment.id, {
    googleEventId: event.eventId,
    googleCalendarId: event.calendarId,
    meetLink: event.meetLink,
  });
}

async function handleMailBooked(appointmentId: string): Promise<void> {
  const repo = new AdminAppointmentRepository();
  const users = new AdminUserRepository();
  const appointment = await repo.getById(appointmentId);
  if (!appointment) throw new Error("Appointment not found");

  const patient = await users.getById(appointment.patientId);
  const specialistProfile = await users.getSpecialistByUserId(
    appointment.specialistId,
  );
  const specialistUser = await users.getById(appointment.specialistId);
  if (!patient) throw new Error("Patient not found");

  const mailResult = await new MailService().sendAppointmentBooked({
    to: patient.email,
    patientName: patient.displayName,
    specialistName:
      specialistUser?.displayName ?? specialistProfile?.specialty ?? "Specialist",
    startsAt: appointment.startsAt,
    endsAt: appointment.endsAt,
    locale: patient.locale === "en" ? "en" : "es",
    meetLink: appointment.meetLink,
  });

  if (!mailResult.ok) {
    throw new Error(mailResult.error || "Mail send failed");
  }
}

async function runJob(job: OutboxJob): Promise<void> {
  if (job.type === "appointment.google_sync") {
    await handleGoogleSync(job.appointmentId);
    return;
  }
  if (job.type === "appointment.mail_booked") {
    await handleMailBooked(job.appointmentId);
    return;
  }
  throw new Error(`Unknown outbox type: ${job.type}`);
}

/**
 * Drain due outbox jobs (cron or inline after booking).
 */
export async function processOutboxBatch(
  limit = 20,
): Promise<ProcessOutboxResult> {
  const outbox = new AdminOutboxRepository();
  const claimed = await outbox.claimDue(limit);
  let done = 0;
  let failed = 0;
  let dead = 0;

  for (const job of claimed) {
    try {
      await runJob(job);
      await outbox.markDone(job.id);
      done += 1;
    } catch (err) {
      const message = err instanceof Error ? err.message : "unknown";
      const updated = await outbox.markFailure(job.id, message);
      if (updated.status === "dead") dead += 1;
      else failed += 1;
      logServer("error", "outbox_job_failed", {
        jobId: job.id,
        type: job.type,
        appointmentId: job.appointmentId,
        attempts: updated.attempts,
        status: updated.status,
        message,
      });
    }
  }

  return { processed: claimed.length, done, failed, dead };
}

export async function enqueueBookingSideEffects(input: {
  clinicId: string;
  appointmentId: string;
}): Promise<void> {
  const outbox = new AdminOutboxRepository();
  await outbox.enqueue({
    clinicId: input.clinicId,
    type: "appointment.google_sync",
    appointmentId: input.appointmentId,
    dedupeKey: `gcal_${input.appointmentId}`,
  });
  await outbox.enqueue({
    clinicId: input.clinicId,
    type: "appointment.mail_booked",
    appointmentId: input.appointmentId,
    dedupeKey: `mail_${input.appointmentId}`,
  });
}
