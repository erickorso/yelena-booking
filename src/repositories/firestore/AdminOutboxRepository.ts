import "server-only";

import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getAdminFirestore } from "@/lib/firebase/admin";
import {
  DEFAULT_OUTBOX_MAX_ATTEMPTS,
  outboxBackoffMs,
  type OutboxJob,
  type OutboxJobType,
  type OutboxStatus,
} from "@/types/domain/outbox";

const COLLECTION = "outboxJobs";

function toDate(value: unknown, fallback = new Date()): Date {
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  return fallback;
}

function adapt(id: string, data: Record<string, unknown>): OutboxJob {
  return {
    id,
    clinicId: typeof data.clinicId === "string" ? data.clinicId : "yelena",
    type: data.type as OutboxJobType,
    appointmentId: String(data.appointmentId ?? ""),
    status: (data.status as OutboxStatus) ?? "pending",
    attempts: typeof data.attempts === "number" ? data.attempts : 0,
    maxAttempts:
      typeof data.maxAttempts === "number"
        ? data.maxAttempts
        : DEFAULT_OUTBOX_MAX_ATTEMPTS,
    nextRunAt: toDate(data.nextRunAt),
    lastError: typeof data.lastError === "string" ? data.lastError : null,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}

export class AdminOutboxRepository {
  private async db() {
    return getAdminFirestore();
  }

  async getById(id: string): Promise<OutboxJob | null> {
    const snap = await (await this.db()).collection(COLLECTION).doc(id).get();
    if (!snap.exists) return null;
    return adapt(snap.id, snap.data() ?? {});
  }

  async enqueue(input: {
    clinicId: string;
    type: OutboxJobType;
    appointmentId: string;
    dedupeKey?: string;
  }): Promise<OutboxJob> {
    const db = await this.db();
    const id = input.dedupeKey?.trim() || db.collection(COLLECTION).doc().id;
    const ref = db.collection(COLLECTION).doc(id);
    const existing = await ref.get();
    if (existing.exists) {
      return adapt(existing.id, existing.data() ?? {});
    }
    const now = new Date();
    await ref.set({
      clinicId: input.clinicId,
      type: input.type,
      appointmentId: input.appointmentId,
      status: "pending",
      attempts: 0,
      maxAttempts: DEFAULT_OUTBOX_MAX_ATTEMPTS,
      nextRunAt: Timestamp.fromDate(now),
      lastError: null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    const snap = await ref.get();
    return adapt(snap.id, snap.data() ?? {});
  }

  /**
   * Claim due pending jobs. Uses status==pending + in-memory nextRunAt
   * (avoids composite index), then TX to flip to processing.
   */
  async claimDue(limit = 20): Promise<OutboxJob[]> {
    const db = await this.db();
    const snap = await db
      .collection(COLLECTION)
      .where("status", "==", "pending")
      .limit(80)
      .get();

    const due = snap.docs
      .map((d) => adapt(d.id, d.data()))
      .filter((j) => j.nextRunAt.getTime() <= Date.now())
      .slice(0, limit);

    const claimed: OutboxJob[] = [];
    for (const job of due) {
      const ref = db.collection(COLLECTION).doc(job.id);
      const ok = await db.runTransaction(async (tx) => {
        const fresh = await tx.get(ref);
        if (!fresh.exists) return false;
        const data = fresh.data() ?? {};
        if (data.status !== "pending") return false;
        if (toDate(data.nextRunAt).getTime() > Date.now()) return false;
        tx.update(ref, {
          status: "processing",
          updatedAt: FieldValue.serverTimestamp(),
        });
        return true;
      });
      if (ok) {
        const after = await ref.get();
        claimed.push(adapt(after.id, after.data() ?? {}));
      }
    }
    return claimed;
  }

  async markDone(id: string): Promise<void> {
    await (await this.db()).collection(COLLECTION).doc(id).update({
      status: "done",
      lastError: null,
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  async markFailure(id: string, error: string): Promise<OutboxJob> {
    const db = await this.db();
    const ref = db.collection(COLLECTION).doc(id);
    const snap = await ref.get();
    const current = adapt(snap.id, snap.data() ?? {});
    const attempts = current.attempts + 1;
    const dead = attempts >= current.maxAttempts;
    const nextRunAt = new Date(Date.now() + outboxBackoffMs(attempts));
    await ref.update({
      attempts,
      status: dead ? "dead" : "pending",
      lastError: error.slice(0, 500),
      nextRunAt: Timestamp.fromDate(nextRunAt),
      updatedAt: FieldValue.serverTimestamp(),
    });
    const after = await ref.get();
    return adapt(after.id, after.data() ?? {});
  }

  async hasOpenJob(
    appointmentId: string,
    type: OutboxJobType,
  ): Promise<boolean> {
    const snap = await (await this.db())
      .collection(COLLECTION)
      .where("appointmentId", "==", appointmentId)
      .where("type", "==", type)
      .limit(10)
      .get();
    return snap.docs.some((d) => {
      const s = d.data().status;
      return s === "pending" || s === "processing";
    });
  }
}
