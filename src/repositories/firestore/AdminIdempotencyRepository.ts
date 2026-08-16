import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import { getAdminFirestore } from "@/lib/firebase/admin";
import {
  hashIdempotencyRequest,
  idempotencyDocId,
} from "@/lib/http/idempotencyHash";

export { hashIdempotencyRequest };

const COLLECTION = "idempotencyKeys";

export type IdempotencyRecord = {
  key: string;
  uid: string;
  clinicId: string;
  requestHash: string;
  status: "pending" | "completed";
  appointmentId: string | null;
  response: Record<string, unknown> | null;
};

export class AdminIdempotencyRepository {
  private async db() {
    return getAdminFirestore();
  }

  async get(uid: string, key: string): Promise<IdempotencyRecord | null> {
    const snap = await (await this.db())
      .collection(COLLECTION)
      .doc(idempotencyDocId(uid, key))
      .get();
    if (!snap.exists) return null;
    const data = snap.data() ?? {};
    return {
      key,
      uid,
      clinicId: typeof data.clinicId === "string" ? data.clinicId : "yelena",
      requestHash: String(data.requestHash ?? ""),
      status: data.status === "completed" ? "completed" : "pending",
      appointmentId:
        typeof data.appointmentId === "string" ? data.appointmentId : null,
      response:
        data.response && typeof data.response === "object"
          ? (data.response as Record<string, unknown>)
          : null,
    };
  }

  async begin(input: {
    uid: string;
    key: string;
    clinicId: string;
    requestHash: string;
  }): Promise<"created" | "exists"> {
    const ref = (await this.db())
      .collection(COLLECTION)
      .doc(idempotencyDocId(input.uid, input.key));
    try {
      await ref.create({
        uid: input.uid,
        key: input.key,
        clinicId: input.clinicId,
        requestHash: input.requestHash,
        status: "pending",
        appointmentId: null,
        response: null,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      return "created";
    } catch {
      return "exists";
    }
  }

  async complete(
    uid: string,
    key: string,
    appointmentId: string,
    response: Record<string, unknown>,
  ): Promise<void> {
    await (await this.db())
      .collection(COLLECTION)
      .doc(idempotencyDocId(uid, key))
      .set(
        {
          status: "completed",
          appointmentId,
          response,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
  }
}
