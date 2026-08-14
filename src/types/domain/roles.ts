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
