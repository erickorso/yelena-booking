import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { adaptSpecialistProfile, adaptUserProfile } from "@/adapters/firestore";
import type { AuthRole, SpecialistProfile, UserProfile } from "@/types/domain";
import type {
  CreateUserProfileInput,
  IUserRepository,
} from "@/repositories/IUserRepository";
import type { CreateSpecialistProfileInput } from "@/repositories/specialistTypes";

const USERS = "users";
const SPECIALISTS = "specialists";

/**
 * Server-side Firestore user repository (Admin SDK — bypasses client rules).
 */
export class AdminUserRepository implements IUserRepository {
  private async db() {
    return getAdminFirestore();
  }

  async getById(id: string): Promise<UserProfile | null> {
    const snap = await (await this.db()).collection(USERS).doc(id).get();
    if (!snap.exists) return null;
    return adaptUserProfile(snap.id, snap.data() ?? {});
  }

  async create(input: CreateUserProfileInput): Promise<UserProfile> {
    const ref = (await this.db()).collection(USERS).doc(input.id);
    const payload = {
      email: input.email,
      displayName: input.displayName,
      photoUrl: input.photoUrl ?? null,
      role: input.role,
      locale: input.locale ?? "es",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };
    await ref.set(payload, { merge: true });
    const snap = await ref.get();
    return adaptUserProfile(snap.id, snap.data() ?? {});
  }

  async updateRole(id: string, role: AuthRole): Promise<UserProfile> {
    const ref = (await this.db()).collection(USERS).doc(id);
    await ref.update({
      role,
      updatedAt: FieldValue.serverTimestamp(),
    });
    const snap = await ref.get();
    if (!snap.exists) {
      throw new Error(`User not found: ${id}`);
    }
    return adaptUserProfile(snap.id, snap.data() ?? {});
  }

  async createSpecialist(
    input: CreateSpecialistProfileInput,
  ): Promise<SpecialistProfile> {
    const ref = (await this.db()).collection(SPECIALISTS).doc(input.id);
    await ref.set(
      {
        userId: input.userId,
        specialty: input.specialty,
        licenseNumber: input.licenseNumber,
        bio: input.bio ?? "",
        location: input.location ?? "",
        rating: null,
        status: input.status ?? "pending",
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    const snap = await ref.get();
    return adaptSpecialistProfile(snap.id, snap.data() ?? {});
  }

  async getSpecialistByUserId(
    userId: string,
  ): Promise<SpecialistProfile | null> {
    const query = await (await this.db())
      .collection(SPECIALISTS)
      .where("userId", "==", userId)
      .limit(1)
      .get();
    if (query.empty) return null;
    const doc = query.docs[0]!;
    return adaptSpecialistProfile(doc.id, doc.data());
  }

  async listPendingSpecialists(): Promise<SpecialistProfile[]> {
    const query = await (await this.db())
      .collection(SPECIALISTS)
      .where("status", "==", "pending")
      .get();
    return query.docs.map((doc) => adaptSpecialistProfile(doc.id, doc.data()));
  }

  async listActiveSpecialists(): Promise<SpecialistProfile[]> {
    const query = await (await this.db())
      .collection(SPECIALISTS)
      .where("status", "==", "active")
      .get();
    return query.docs.map((doc) => adaptSpecialistProfile(doc.id, doc.data()));
  }

  async setSpecialistStatus(
    specialistId: string,
    status: SpecialistProfile["status"],
  ): Promise<SpecialistProfile> {
    const ref = (await this.db()).collection(SPECIALISTS).doc(specialistId);
    await ref.update({
      status,
      updatedAt: FieldValue.serverTimestamp(),
    });
    const snap = await ref.get();
    if (!snap.exists) {
      throw new Error(`Specialist not found: ${specialistId}`);
    }
    return adaptSpecialistProfile(snap.id, snap.data() ?? {});
  }
}
