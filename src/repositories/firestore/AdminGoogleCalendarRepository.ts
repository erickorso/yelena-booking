import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import { getAdminFirestore } from "@/lib/firebase/admin";
import type { GoogleCalendarConnection } from "@/types/domain";

const COLLECTION = "googleCalendarConnections";

type ConnectionDoc = {
  specialistId?: unknown;
  googleEmail?: unknown;
  accessToken?: unknown;
  refreshToken?: unknown;
  expiryDate?: unknown;
  calendarId?: unknown;
  connectedAt?: unknown;
  updatedAt?: unknown;
};

function toDate(value: unknown, fallback = new Date()): Date {
  if (value instanceof Date) return value;
  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof (value as { toDate: () => Date }).toDate === "function"
  ) {
    return (value as { toDate: () => Date }).toDate();
  }
  if (typeof value === "string" || typeof value === "number") {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return fallback;
}

function adapt(id: string, data: ConnectionDoc): GoogleCalendarConnection | null {
  const accessToken =
    typeof data.accessToken === "string" ? data.accessToken : "";
  const refreshToken =
    typeof data.refreshToken === "string" ? data.refreshToken : "";
  if (!accessToken && !refreshToken) return null;

  return {
    specialistId: id,
    googleEmail:
      typeof data.googleEmail === "string" ? data.googleEmail : null,
    accessToken,
    refreshToken,
    expiryDate:
      typeof data.expiryDate === "number" ? data.expiryDate : null,
    calendarId:
      typeof data.calendarId === "string" && data.calendarId
        ? data.calendarId
        : "primary",
    connectedAt: toDate(data.connectedAt),
    updatedAt: toDate(data.updatedAt),
  };
}

/**
 * Server-side tokens for Google Calendar OAuth (per specialist).
 */
export class AdminGoogleCalendarRepository {
  private async db() {
    return getAdminFirestore();
  }

  async get(specialistId: string): Promise<GoogleCalendarConnection | null> {
    const snap = await (await this.db())
      .collection(COLLECTION)
      .doc(specialistId)
      .get();
    if (!snap.exists) return null;
    return adapt(snap.id, snap.data() ?? {});
  }

  async upsert(input: {
    specialistId: string;
    googleEmail: string | null;
    accessToken: string;
    refreshToken: string;
    expiryDate: number | null;
    calendarId?: string;
  }): Promise<GoogleCalendarConnection> {
    const ref = (await this.db()).collection(COLLECTION).doc(input.specialistId);
    const existing = await ref.get();
    const payload = {
      specialistId: input.specialistId,
      googleEmail: input.googleEmail,
      accessToken: input.accessToken,
      refreshToken: input.refreshToken,
      expiryDate: input.expiryDate,
      calendarId: input.calendarId ?? "primary",
      updatedAt: FieldValue.serverTimestamp(),
      ...(existing.exists
        ? {}
        : { connectedAt: FieldValue.serverTimestamp() }),
    };
    await ref.set(payload, { merge: true });
    const snap = await ref.get();
    const adapted = adapt(snap.id, snap.data() ?? {});
    if (!adapted) throw new Error("Failed to persist Google Calendar connection");
    return adapted;
  }

  async updateTokens(
    specialistId: string,
    tokens: {
      accessToken?: string | null;
      refreshToken?: string | null;
      expiryDate?: number | null;
    },
  ): Promise<void> {
    const patch: Record<string, unknown> = {
      updatedAt: FieldValue.serverTimestamp(),
    };
    if (tokens.accessToken) patch.accessToken = tokens.accessToken;
    if (tokens.refreshToken) patch.refreshToken = tokens.refreshToken;
    if (tokens.expiryDate !== undefined) patch.expiryDate = tokens.expiryDate;
    await (await this.db()).collection(COLLECTION).doc(specialistId).update(patch);
  }

  async delete(specialistId: string): Promise<void> {
    await (await this.db()).collection(COLLECTION).doc(specialistId).delete();
  }
}
