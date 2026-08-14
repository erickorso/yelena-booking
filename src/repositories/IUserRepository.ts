import type { UserProfile, AuthRole, SpecialistProfile } from "@/types/domain";

export interface CreateUserProfileInput {
  id: string;
  email: string;
  displayName: string;
  photoUrl?: string | null;
  role: AuthRole;
  locale?: "en" | "es";
}

/**
 * Abstraction over user + specialist profile persistence.
 */
export interface IUserRepository {
  getById(id: string): Promise<UserProfile | null>;
  create(input: CreateUserProfileInput): Promise<UserProfile>;
  updateRole(id: string, role: AuthRole): Promise<UserProfile>;
  getSpecialistByUserId(userId: string): Promise<SpecialistProfile | null>;
  listPendingSpecialists(): Promise<SpecialistProfile[]>;
  setSpecialistStatus(
    specialistId: string,
    status: SpecialistProfile["status"],
  ): Promise<SpecialistProfile>;
}
