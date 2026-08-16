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
  /** Google Calendar event id when synced. */
  googleEventId: string | null;
  googleCalendarId: string | null;
  /** Google Meet link from conferenceData (if created). */
  meetLink: string | null;
  /** If this booking replaces a cancelled ghost appointment. */
  rescheduledFromId: string | null;
  /** Latest rebooking created from this cancelled ghost. */
  rescheduledToId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Allowed status transitions (finite state machine). */
export const APPOINTMENT_TRANSITIONS: Record<
  AppointmentStatus,
  readonly AppointmentStatus[]
> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["completed", "cancelled", "no_show"],
  completed: [],
  cancelled: [],
  no_show: [],
};

export function isAppointmentStatus(
  value: unknown,
): value is AppointmentStatus {
  return (
    typeof value === "string" &&
    (APPOINTMENT_STATUSES as readonly string[]).includes(value)
  );
}

export function isTransferStatus(value: unknown): value is TransferStatus {
  return (
    typeof value === "string" &&
    (TRANSFER_STATUSES as readonly string[]).includes(value)
  );
}

export function assertValidAppointmentInterval(
  startsAt: Date,
  endsAt: Date,
): void {
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
    throw new Error("Invalid appointment dates");
  }
  if (endsAt <= startsAt) {
    throw new Error("Appointment end must be after start");
  }
}

export function canTransitionAppointment(
  from: AppointmentStatus,
  to: AppointmentStatus,
): boolean {
  return APPOINTMENT_TRANSITIONS[from].includes(to);
}

export function assertCanTransitionAppointment(
  from: AppointmentStatus,
  to: AppointmentStatus,
): void {
  if (!canTransitionAppointment(from, to)) {
    throw new Error(`Cannot transition appointment from ${from} to ${to}`);
  }
}

/** Transfer request is allowed only when no transfer is in flight / accepted. */
export function canRequestTransfer(appointment: Appointment): boolean {
  if (appointment.status === "cancelled" || appointment.status === "completed") {
    return false;
  }
  return (
    appointment.transfer.status === "none" ||
    appointment.transfer.status === "rejected"
  );
}

export function assertCanRequestTransfer(appointment: Appointment): void {
  if (!canRequestTransfer(appointment)) {
    throw new Error("Transfer not allowed for this appointment");
  }
}
