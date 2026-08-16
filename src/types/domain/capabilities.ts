import type { AuthRole } from "@/types/domain/roles";
import { canActAsPatient, canActAsSpecialist } from "@/types/domain/roles";

/**
 * Formal "acting as" contexts — one user may hold multiple capabilities.
 */
export type ActingContext =
  | "patient_self"
  | "specialist_clinic"
  | "admin_governance";

export type Capability =
  | "book_self"
  | "book_on_behalf"
  | "manage_own_schedule"
  | "manage_own_clinical_fields"
  | "view_patient_chart"
  | "approve_specialists"
  | "admin_mail_test";

const BY_CONTEXT: Record<ActingContext, readonly Capability[]> = {
  patient_self: ["book_self"],
  specialist_clinic: [
    "book_self",
    "book_on_behalf",
    "manage_own_schedule",
    "manage_own_clinical_fields",
    "view_patient_chart",
  ],
  admin_governance: [
    "book_self",
    "book_on_behalf",
    "manage_own_schedule",
    "manage_own_clinical_fields",
    "view_patient_chart",
    "approve_specialists",
    "admin_mail_test",
  ],
};

export function contextsForRole(role: AuthRole): ActingContext[] {
  const out: ActingContext[] = [];
  if (canActAsPatient(role)) out.push("patient_self");
  if (role === "especialista") out.push("specialist_clinic");
  if (role === "admin") out.push("admin_governance");
  return out;
}

export function hasCapability(
  role: AuthRole,
  capability: Capability,
): boolean {
  return contextsForRole(role).some((ctx) =>
    BY_CONTEXT[ctx].includes(capability),
  );
}

export function assertCapability(
  role: AuthRole,
  capability: Capability,
): void {
  if (!hasCapability(role, capability)) {
    throw new Error(`Missing capability: ${capability}`);
  }
}

/** Specialist clinic ops require active specialist (admin bypasses). */
export function canOperateClinic(
  role: AuthRole,
  specialistStatus: string | null | undefined,
): boolean {
  if (role === "admin") return true;
  if (!canActAsSpecialist(role)) return false;
  return specialistStatus === "active";
}
