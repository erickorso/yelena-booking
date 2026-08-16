import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import { getAdminFirestore } from "@/lib/firebase/admin";
import {
  canonicalizeSpecialty,
  DEFAULT_SPECIALTIES,
  mergeSpecialtyCatalog,
  normalizeSpecialty,
} from "@/lib/specialties/catalog";

const COLLECTION = "specialties";

export type SpecialtyDoc = {
  id: string;
  name: string;
  normalized: string;
  createdBy: string | null;
};

/**
 * Firestore-backed custom specialties + seeded defaults.
 */
export class AdminSpecialtyRepository {
  private async db() {
    return getAdminFirestore();
  }

  async listCustom(): Promise<SpecialtyDoc[]> {
    const snap = await (await this.db()).collection(COLLECTION).get();
    return snap.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        name: typeof data.name === "string" ? data.name : doc.id,
        normalized:
          typeof data.normalized === "string"
            ? data.normalized
            : normalizeSpecialty(String(data.name ?? doc.id)),
        createdBy:
          typeof data.createdBy === "string" ? data.createdBy : null,
      };
    });
  }

  async listNames(): Promise<string[]> {
    const custom = await this.listCustom();
    return mergeSpecialtyCatalog(
      DEFAULT_SPECIALTIES,
      custom.map((c) => c.name),
    );
  }

  async findByNormalized(normalized: string): Promise<SpecialtyDoc | null> {
    const snap = await (await this.db())
      .collection(COLLECTION)
      .where("normalized", "==", normalized)
      .limit(1)
      .get();
    if (snap.empty) return null;
    const doc = snap.docs[0]!;
    const data = doc.data();
    return {
      id: doc.id,
      name: typeof data.name === "string" ? data.name : doc.id,
      normalized:
        typeof data.normalized === "string"
          ? data.normalized
          : normalizeSpecialty(String(data.name ?? doc.id)),
      createdBy: typeof data.createdBy === "string" ? data.createdBy : null,
    };
  }

  /**
   * Resolve to catalog label; persist customs so others can pick them.
   */
  async ensure(
    rawName: string,
    createdBy: string | null,
  ): Promise<string> {
    const catalog = await this.listNames();
    const name = canonicalizeSpecialty(rawName, catalog);
    if (!name) {
      throw new Error("Specialty name is required");
    }
    const normalized = normalizeSpecialty(name);
    const existingDefault = DEFAULT_SPECIALTIES.find(
      (s) => normalizeSpecialty(s) === normalized,
    );
    if (existingDefault) return existingDefault;

    const existing = await this.findByNormalized(normalized);
    if (existing) return existing.name;

    const ref = (await this.db()).collection(COLLECTION).doc();
    await ref.set({
      name,
      normalized,
      createdBy,
      createdAt: FieldValue.serverTimestamp(),
    });
    return name;
  }
}
