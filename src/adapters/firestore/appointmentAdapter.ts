import type {
  Appointment,
  AppointmentStatus,
  AppointmentTransfer,
  TransferStatus,
} from "@/types/domain";
import { APPOINTMENT_STATUSES, TRANSFER_STATUSES } from "@/types/domain";
import { optionalString, requireString, toDate } from "./helpers";

export interface AppointmentDoc {
  patientId?: unknown;
  specialistId?: unknown;
  bookedById?: unknown;
  startsAt?: unknown;
  endsAt?: unknown;
  status?: unknown;
  notes?: unknown;
  transfer?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
}

function isAppointmentStatus(value: unknown): value is AppointmentStatus {
  return (
    typeof value === "string" &&
    (APPOINTMENT_STATUSES as readonly string[]).includes(value)
  );
}

function isTransferStatus(value: unknown): value is TransferStatus {
  return (
    typeof value === "string" &&
    (TRANSFER_STATUSES as readonly string[]).includes(value)
  );
}

function optionalDate(value: unknown): Date | null {
  if (value === null || value === undefined) return null;
  try {
    return toDate(value);
  } catch {
    return null;
  }
}

function emptyTransfer(): AppointmentTransfer {
  return {
    status: "none",
    toSpecialistId: null,
    fromSpecialistId: null,
    requestedBy: null,
    requestedAt: null,
    respondedAt: null,
  };
}

function adaptTransfer(raw: unknown): AppointmentTransfer {
  if (!raw || typeof raw !== "object") return emptyTransfer();
  const data = raw as Record<string, unknown>;
  const status = isTransferStatus(data.status) ? data.status : "none";
  return {
    status,
    toSpecialistId: optionalString(data.toSpecialistId ?? null),
    fromSpecialistId: optionalString(data.fromSpecialistId ?? null),
    requestedBy: optionalString(data.requestedBy ?? null),
    requestedAt: optionalDate(data.requestedAt),
    respondedAt: optionalDate(data.respondedAt),
  };
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
    bookedById: optionalString(data.bookedById),
    startsAt: toDate(data.startsAt),
    endsAt: toDate(data.endsAt),
    status: data.status,
    notes: optionalString(data.notes),
    transfer: adaptTransfer(data.transfer),
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}
