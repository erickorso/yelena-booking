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
import { derivePatientNumber } from "@/lib/patients/patientNumber";

const USERS = "users";
const SPECIALISTS = "specialists";

/**
 * Server-side Firestore user repository (Admin SDK — bypasses client rules).
 */
export class AdminUserRepository implements IUserRepository {
  private async db() {
    return getAdminFirestore();
  }

  private async hydrateUser(
    id: string,
    data: Record<string, unknown>,
  ): Promise<UserProfile> {
    const profile = adaptUserProfile(id, data);
    const stored =
      typeof data.patientNumber === "string" && data.patientNumber.trim();
    if (!stored) {
      try {
        await (await this.db()).collection(USERS).doc(id).update({
          patientNumber: profile.patientNumber,
          updatedAt: FieldValue.serverTimestamp(),
        });
      } catch (err) {
        console.error("[users] backfill patientNumber failed", id, err);
      }
    }
    return profile;
  }

  async getById(id: string): Promise<UserProfile | null> {
    const snap = await (await this.db()).collection(USERS).doc(id).get();
    if (!snap.exists) return null;
    return this.hydrateUser(snap.id, (snap.data() ?? {}) as Record<string, unknown>);
  }

  async create(input: CreateUserProfileInput): Promise<UserProfile> {
    const ref = (await this.db()).collection(USERS).doc(input.id);
    const patientNumber =
      input.patientNumber?.trim() || derivePatientNumber(input.id);
    const payload = {
      email: input.email.trim().toLowerCase(),
      displayName: input.displayName,
      photoUrl: input.photoUrl ?? null,
      role: input.role,
      locale: input.locale ?? "es",
      timezone: input.timezone ?? null,
      patientNumber,
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

  async updatePhotoUrl(
    id: string,
    photoUrl: string | null,
  ): Promise<UserProfile> {
    const ref = (await this.db()).collection(USERS).doc(id);
    await ref.update({
      photoUrl,
      updatedAt: FieldValue.serverTimestamp(),
    });
    const snap = await ref.get();
    if (!snap.exists) {
      throw new Error(`User not found: ${id}`);
    }
    return adaptUserProfile(snap.id, snap.data() ?? {});
  }

  async updateTimezone(
    id: string,
    timezone: string | null,
  ): Promise<UserProfile> {
    const ref = (await this.db()).collection(USERS).doc(id);
    await ref.update({
      timezone,
      updatedAt: FieldValue.serverTimestamp(),
    });
    const snap = await ref.get();
    if (!snap.exists) {
      throw new Error(`User not found: ${id}`);
    }
    return adaptUserProfile(snap.id, snap.data() ?? {});
  }

  async updateDisplayName(
    id: string,
    displayName: string,
  ): Promise<UserProfile> {
    const name = displayName.trim();
    if (!name) {
      throw new Error("displayName is required");
    }
    const ref = (await this.db()).collection(USERS).doc(id);
    await ref.update({
      displayName: name,
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
        timezone: null,
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

  /** Users that can be booked as patients (paciente + especialista). */
  async listBookablePatients(limit = 100): Promise<UserProfile[]> {
    const db = await this.db();
    const [pacientes, especialistas] = await Promise.all([
      db.collection(USERS).where("role", "==", "paciente").limit(limit).get(),
      db
        .collection(USERS)
        .where("role", "==", "especialista")
        .limit(limit)
        .get(),
    ]);
    const byId = new Map<string, UserProfile>();
    await Promise.all(
      [...pacientes.docs, ...especialistas.docs].map(async (doc) => {
        const profile = await this.hydrateUser(
          doc.id,
          (doc.data() ?? {}) as Record<string, unknown>,
        );
        byId.set(doc.id, profile);
      }),
    );
    return [...byId.values()].sort((a, b) =>
      a.displayName.localeCompare(b.displayName, "es"),
    );
  }

  /** Patients only (public profile fields for admin review). */
  async listPatients(limit = 200): Promise<UserProfile[]> {
    const snap = await (await this.db())
      .collection(USERS)
      .where("role", "==", "paciente")
      .limit(limit)
      .get();
    const profiles = await Promise.all(
      snap.docs.map((doc) =>
        this.hydrateUser(doc.id, (doc.data() ?? {}) as Record<string, unknown>),
      ),
    );
    return profiles.sort((a, b) =>
      a.displayName.localeCompare(b.displayName, "es"),
    );
  }

  /** All specialist profiles (any status) — used to know who already applied. */
  async listAllSpecialists(limit = 500): Promise<SpecialistProfile[]> {
    const snap = await (await this.db())
      .collection(SPECIALISTS)
      .limit(limit)
      .get();
    return snap.docs.map((doc) => adaptSpecialistProfile(doc.id, doc.data()));
  }

  async findByEmail(email: string): Promise<UserProfile | null> {
    const query = await (await this.db())
      .collection(USERS)
      .where("email", "==", email.trim().toLowerCase())
      .limit(1)
      .get();
    if (query.empty) return null;
    const doc = query.docs[0]!;
    return this.hydrateUser(doc.id, (doc.data() ?? {}) as Record<string, unknown>);
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
