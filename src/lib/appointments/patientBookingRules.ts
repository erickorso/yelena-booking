import type { Appointment } from "@/types/domain";
import { normalizeSpecialty } from "@/lib/specialties/catalog";

export { normalizeSpecialty } from "@/lib/specialties/catalog";

/** Statuses that hold the patient's calendar / specialty slot. */
export const PATIENT_ACTIVE_STATUSES = new Set(["pending", "confirmed"]);

export function isPatientActiveAppointment(status: string): boolean {
  return PATIENT_ACTIVE_STATUSES.has(status);
}

export type PatientBookingCheck =
  | { ok: true }
  | { ok: false; code: "specialty" | "time"; error: string };

/**
 * One active booking per specialty (any specialist) + no overlapping patient times.
 */
export function checkPatientBookingConstraints(args: {
  patientAppointments: Appointment[];
  specialtyBySpecialistId: Map<string, string>;
  targetSpecialty: string;
  startsAt: Date;
  endsAt: Date;
  /** Appointment being moved / ignored (reschedule). */
  excludeAppointmentId?: string | null;
}): PatientBookingCheck {
  const {
    patientAppointments,
    specialtyBySpecialistId,
    targetSpecialty,
    startsAt,
    endsAt,
    excludeAppointmentId,
  } = args;

  const targetNorm = normalizeSpecialty(targetSpecialty);
  const active = patientAppointments.filter(
    (a) =>
      a.id !== excludeAppointmentId && isPatientActiveAppointment(a.status),
  );

  if (
    active.some((a) => {
      const other = specialtyBySpecialistId.get(a.specialistId);
      return other != null && normalizeSpecialty(other) === targetNorm;
    })
  ) {
    return {
      ok: false,
      code: "specialty",
      error:
        "Ya tienes una cita activa de esta especialidad (aunque sea con otro especialista)",
    };
  }

  if (active.some((a) => startsAt < a.endsAt && a.startsAt < endsAt)) {
    return {
      ok: false,
      code: "time",
      error: "Ya tienes otra cita en ese horario",
    };
  }

  return { ok: true };
}

/** Build specialty map for the specialists involved in patient appointments + target. */
export async function buildSpecialtyMap(
  specialistIds: string[],
  getSpecialty: (specialistId: string) => Promise<string | null>,
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const unique = [...new Set(specialistIds.filter(Boolean))];
  await Promise.all(
    unique.map(async (id) => {
      const specialty = await getSpecialty(id);
      if (specialty) map.set(id, specialty);
    }),
  );
  return map;
}

export async function evaluatePatientBooking(args: {
  patientAppointments: Appointment[];
  targetSpecialistId: string;
  targetSpecialty: string;
  startsAt: Date;
  endsAt: Date;
  excludeAppointmentId?: string | null;
  getSpecialty: (specialistId: string) => Promise<string | null>;
}): Promise<PatientBookingCheck> {
  const ids = [
    args.targetSpecialistId,
    ...args.patientAppointments.map((a) => a.specialistId),
  ];
  const specialtyBySpecialistId = await buildSpecialtyMap(
    ids,
    args.getSpecialty,
  );
  return checkPatientBookingConstraints({
    patientAppointments: args.patientAppointments,
    specialtyBySpecialistId,
    targetSpecialty: args.targetSpecialty,
    startsAt: args.startsAt,
    endsAt: args.endsAt,
    excludeAppointmentId: args.excludeAppointmentId,
  });
}
