export const APPOINTMENT_STATUSES = [
  "pending",
  "confirmed",
  "completed",
  "cancelled",
  "no_show",
] as const;

export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

export const TRANSFER_STATUSES = [
  "none",
  "pending",
  "accepted",
  "rejected",
] as const;

export type TransferStatus = (typeof TRANSFER_STATUSES)[number];

export interface AppointmentTransfer {
  status: TransferStatus;
  toSpecialistId: string | null;
  fromSpecialistId: string | null;
  requestedBy: string | null;
  requestedAt: Date | null;
  respondedAt: Date | null;
}

export interface Appointment {
  id: string;
  patientId: string;
  specialistId: string;
  /** Who created the booking (patient self-serve or specialist/admin on behalf). */
  bookedById: string | null;
  startsAt: Date;
  endsAt: Date;
  status: AppointmentStatus;
  notes: string | null;
  transfer: AppointmentTransfer;
  createdAt: Date;
  updatedAt: Date;
}

