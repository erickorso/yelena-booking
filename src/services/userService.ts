import type { AuthRole, UserProfile } from "@/types/domain";
import type { CreateUserProfileInput, IUserRepository } from "@/repositories";

/**
 * Use-case layer for identity / profiles.
 */
export class UserService {
  constructor(private readonly users: IUserRepository) {}

  getById(id: string): Promise<UserProfile | null> {
    return this.users.getById(id);
  }

  createProfile(input: CreateUserProfileInput): Promise<UserProfile> {
    return this.users.create(input);
  }

  assignRole(id: string, role: AuthRole): Promise<UserProfile> {
    return this.users.updateRole(id, role);
  }

  listPendingSpecialists() {
    return this.users.listPendingSpecialists();
  }

  approveSpecialist(specialistId: string) {
    return this.users.setSpecialistStatus(specialistId, "active");
  }

  rejectSpecialist(specialistId: string) {
    return this.users.setSpecialistStatus(specialistId, "rejected");
  }
}
