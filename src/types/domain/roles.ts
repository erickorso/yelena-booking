/**
 * Authenticated custom-claim roles.
 * Guest (`invitado`) is unauthenticated — never stored as a claim.
 */
export const AUTH_ROLES = ["paciente", "especialista", "admin"] as const;

export type AuthRole = (typeof AUTH_ROLES)[number];

export type AppRole = AuthRole | "invitado";

export function isAuthRole(value: unknown): value is AuthRole {
  return (
    typeof value === "string" &&
    (AUTH_ROLES as readonly string[]).includes(value)
  );
}

/** Paciente, especialista y admin pueden reservar / figurar como pacientes. */
export function canActAsPatient(role: AuthRole | null | undefined): boolean {
  return role === "paciente" || role === "especialista" || role === "admin";
}

/** Especialista y admin operan agenda clínica (tras aprobación si aplica). */
export function canActAsSpecialist(role: AuthRole | null | undefined): boolean {
  return role === "especialista" || role === "admin";
}
