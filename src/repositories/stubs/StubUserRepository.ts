import type {
  AuthRole,
  SpecialistProfile,
  UserProfile,
} from "@/types/domain";
import type {
  CreateUserProfileInput,
  IUserRepository,
} from "../IUserRepository";
import type { CreateSpecialistProfileInput } from "../specialistTypes";

/**
 * In-memory stub for UI / tests until Firestore credentials are wired.
 */
export class StubUserRepository implements IUserRepository {
  private readonly users = new Map<string, UserProfile>();
  private readonly specialists = new Map<string, SpecialistProfile>();

  async getById(id: string): Promise<UserProfile | null> {
    return this.users.get(id) ?? null;
  }

  async create(input: CreateUserProfileInput): Promise<UserProfile> {
    const now = new Date();
    const profile: UserProfile = {
      id: input.id,
      email: input.email,
      displayName: input.displayName,
      photoUrl: input.photoUrl ?? null,
      role: input.role,
      locale: input.locale ?? "es",
      timezone: input.timezone ?? null,
      createdAt: now,
      updatedAt: now,
    };
    this.users.set(profile.id, profile);
    return profile;
  }

  async updateRole(id: string, role: AuthRole): Promise<UserProfile> {
    const existing = this.users.get(id);
    if (!existing) {
      throw new Error(`User not found: ${id}`);
    }
    const updated: UserProfile = { ...existing, role, updatedAt: new Date() };
    this.users.set(id, updated);
    return updated;
  }

  async updatePhotoUrl(
    id: string,
    photoUrl: string | null,
  ): Promise<UserProfile> {
    const existing = this.users.get(id);
    if (!existing) {
      throw new Error(`User not found: ${id}`);
    }
    const updated: UserProfile = {
      ...existing,
      photoUrl,
      updatedAt: new Date(),
    };
    this.users.set(id, updated);
    return updated;
  }

  async updateTimezone(
    id: string,
    timezone: string | null,
  ): Promise<UserProfile> {
    const existing = this.users.get(id);
    if (!existing) {
      throw new Error(`User not found: ${id}`);
    }
    const updated: UserProfile = {
      ...existing,
      timezone,
      updatedAt: new Date(),
    };
    this.users.set(id, updated);
    return updated;
  }

  async createSpecialist(
    input: CreateSpecialistProfileInput,
  ): Promise<SpecialistProfile> {
    const now = new Date();
    const profile: SpecialistProfile = {
      id: input.id,
      userId: input.userId,
      specialty: input.specialty,
      licenseNumber: input.licenseNumber,
      bio: input.bio ?? "",
      location: input.location ?? "",
      rating: null,
      status: input.status ?? "pending",
      timezone: null,
      createdAt: now,
      updatedAt: now,
    };
    this.specialists.set(profile.id, profile);
    return profile;
  }

  async getSpecialistByUserId(
    userId: string,
  ): Promise<SpecialistProfile | null> {
    for (const specialist of this.specialists.values()) {
      if (specialist.userId === userId) {
        return specialist;
      }
    }
    return null;
  }

  async listPendingSpecialists(): Promise<SpecialistProfile[]> {
    return [...this.specialists.values()].filter((s) => s.status === "pending");
  }

  async setSpecialistStatus(
    specialistId: string,
    status: SpecialistProfile["status"],
  ): Promise<SpecialistProfile> {
    const existing = this.specialists.get(specialistId);
    if (!existing) {
      throw new Error(`Specialist not found: ${specialistId}`);
    }
    const updated: SpecialistProfile = {
      ...existing,
      status,
      updatedAt: new Date(),
    };
    this.specialists.set(specialistId, updated);
    return updated;
  }
}
