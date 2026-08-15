import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import { getAdminFirestore } from "@/lib/firebase/admin";
import type { AppNotification, NotificationKind } from "@/types/domain";

const COLLECTION = "notifications";

function adaptNotification(
  id: string,
  data: Record<string, unknown>,
): AppNotification {
  const createdRaw = data.createdAt as { toDate?: () => Date } | undefined;
  const readRaw = data.readAt as { toDate?: () => Date } | null | undefined;
  const createdAt =
    createdRaw && typeof createdRaw.toDate === "function"
      ? createdRaw.toDate()
      : new Date();
  const readAt =
    readRaw && typeof readRaw.toDate === "function" ? readRaw.toDate() : null;

  return {
    id,
    userId: String(data.userId ?? ""),
    kind: data.kind as NotificationKind,
    title: String(data.title ?? ""),
    body: String(data.body ?? ""),
    href: typeof data.href === "string" ? data.href : null,
    readAt,
    meta:
      data.meta && typeof data.meta === "object"
        ? (data.meta as Record<string, string>)
        : {},
    createdAt,
  };
}

export type CreateNotificationInput = {
  userId: string;
  kind: NotificationKind;
  title: string;
  body: string;
  href?: string | null;
  meta?: Record<string, string>;
};

export class AdminNotificationRepository {
  private async db() {
    return getAdminFirestore();
  }

  async create(input: CreateNotificationInput): Promise<AppNotification> {
    const ref = (await this.db()).collection(COLLECTION).doc();
    await ref.set({
      userId: input.userId,
      kind: input.kind,
      title: input.title,
      body: input.body,
      href: input.href ?? null,
      meta: input.meta ?? {},
      readAt: null,
      createdAt: FieldValue.serverTimestamp(),
    });
    const snap = await ref.get();
    return adaptNotification(snap.id, (snap.data() ?? {}) as Record<string, unknown>);
  }

  async listForUser(userId: string, limit = 30): Promise<AppNotification[]> {
    const snap = await (await this.db())
      .collection(COLLECTION)
      .where("userId", "==", userId)
      .limit(limit)
      .get();
    return snap.docs
      .map((d) => adaptNotification(d.id, d.data() as Record<string, unknown>))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async markRead(id: string, userId: string): Promise<AppNotification | null> {
    const ref = (await this.db()).collection(COLLECTION).doc(id);
    const snap = await ref.get();
    if (!snap.exists) return null;
    const data = snap.data() ?? {};
    if (data.userId !== userId) return null;
    await ref.update({ readAt: FieldValue.serverTimestamp() });
    const next = await ref.get();
    return adaptNotification(next.id, (next.data() ?? {}) as Record<string, unknown>);
  }
}
