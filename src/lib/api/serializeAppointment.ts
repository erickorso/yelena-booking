import type { Appointment } from "@/types/domain";

/** Stable JSON shape for appointment APIs (list + detail). */
export function serializeAppointment(appointment: Appointment) {
  return {
    id: appointment.id,
    patientId: appointment.patientId,
    specialistId: appointment.specialistId,
    clinicId: appointment.clinicId,
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
