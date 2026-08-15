import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { adaptAppointment } from "@/adapters/firestore";
import type { Appointment, AppointmentStatus } from "@/types/domain";
import type {
  AppointmentFilters,
  CreateAppointmentInput,
  IAppointmentRepository,
} from "@/repositories/IAppointmentRepository";

const COLLECTION = "appointments";

/**
 * Server-side Firestore appointment repository (Admin SDK).
 */
export class AdminAppointmentRepository implements IAppointmentRepository {
  private async db() {
    return getAdminFirestore();
  }

  async getById(id: string): Promise<Appointment | null> {
    const snap = await (await this.db()).collection(COLLECTION).doc(id).get();
    if (!snap.exists) return null;
    return adaptAppointment(snap.id, snap.data() ?? {});
  }

  async list(filters: AppointmentFilters): Promise<Appointment[]> {
    const col = (await this.db()).collection(COLLECTION);
    // Prefer single-field queries to avoid composite-index requirements in v1.
    let snap;
    if (filters.patientId) {
      snap = await col.where("patientId", "==", filters.patientId).get();
    } else if (filters.specialistId) {
      snap = await col.where("specialistId", "==", filters.specialistId).get();
    } else {
      snap = await col.limit(100).get();
    }

    return snap.docs
      .map((doc) => adaptAppointment(doc.id, doc.data()))
      .filter((a) => {
        if (filters.patientId && a.patientId !== filters.patientId) return false;
        if (filters.specialistId && a.specialistId !== filters.specialistId)
          return false;
        if (filters.status && a.status !== filters.status) return false;
        return true;
      })
      .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  }

  async create(input: CreateAppointmentInput): Promise<Appointment> {
    const ref = (await this.db()).collection(COLLECTION).doc();
    await ref.set({
      patientId: input.patientId,
      specialistId: input.specialistId,
      bookedById: input.bookedById ?? null,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      status: "pending",
      notes: input.notes ?? null,
      transfer: {
        status: "none",
        toSpecialistId: null,
        fromSpecialistId: null,
        requestedBy: null,
        requestedAt: null,
        respondedAt: null,
      },
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    const snap = await ref.get();
    return adaptAppointment(snap.id, snap.data() ?? {});
  }

  async updateStatus(
    id: string,
    status: AppointmentStatus,
  ): Promise<Appointment> {
    const ref = (await this.db()).collection(COLLECTION).doc(id);
    await ref.update({
      status,
      updatedAt: FieldValue.serverTimestamp(),
    });
    const snap = await ref.get();
    if (!snap.exists) {
      throw new Error(`Appointment not found: ${id}`);
    }
    return adaptAppointment(snap.id, snap.data() ?? {});
  }

  async updateFields(
    id: string,
    fields: Record<string, unknown>,
  ): Promise<Appointment> {
    const ref = (await this.db()).collection(COLLECTION).doc(id);
    await ref.update({
      ...fields,
      updatedAt: FieldValue.serverTimestamp(),
    });
    const snap = await ref.get();
    if (!snap.exists) {
      throw new Error(`Appointment not found: ${id}`);
    }
    return adaptAppointment(snap.id, snap.data() ?? {});
  }
}
