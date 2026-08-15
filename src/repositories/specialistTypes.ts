import type { SpecialistProfile, SpecialistStatus } from "@/types/domain";

export interface CreateSpecialistProfileInput {
  /** Prefer same id as userId for 1:1 mapping. */
  id: string;
  userId: string;
  specialty: string;
  licenseNumber: string;
  bio?: string;
  location?: string;
  status?: SpecialistStatus;
}

export type { SpecialistProfile };
