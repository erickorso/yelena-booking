import type { Appointment, AppointmentStatus } from "@/types/domain";
import { APPOINTMENT_STATUSES } from "@/types/domain";
import { optionalString, requireString, toDate } from "./helpers";

export interface AppointmentDoc {
  patientId?: unknown;
  specialistId?: unknown;
  startsAt?: unknown;
  endsAt?: unknown;
  status?: unknown;
  notes?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
}

function isAppointmentStatus(value: unknown): value is AppointmentStatus {
  return (
    typeof value === "string" &&
    (APPOINTMENT_STATUSES as readonly string[]).includes(value)
  );
}

/**
 * Adapts a raw Firestore appointment document into Appointment.
 */
export function adaptAppointment(
  id: string,
  data: AppointmentDoc,
): Appointment {
  if (!isAppointmentStatus(data.status)) {
    throw new Error(`Invalid appointment status on ${id}`);
  }

  return {
    id,
    patientId: requireString(data.patientId, "patientId"),
    specialistId: requireString(data.specialistId, "specialistId"),
    startsAt: toDate(data.startsAt),
    endsAt: toDate(data.endsAt),
    status: data.status,
    notes: optionalString(data.notes),
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}
