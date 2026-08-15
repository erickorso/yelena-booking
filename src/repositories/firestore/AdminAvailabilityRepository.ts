import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import { getAdminFirestore } from "@/lib/firebase/admin";
import type { TimeRange, Weekday } from "@/types/domain";
import {
  DEFAULT_SCHEDULE,
  type ScheduleConfig,
} from "@/lib/availability/defaultSlots";

const COLLECTION = "availabilitySchedules";

export type SpecialistScheduleDoc = ScheduleConfig & {
  specialistId: string;
  timezone: string;
  updatedAt: Date;
  createdAt: Date;
};

function asWeekday(n: unknown): Weekday | null {
  if (typeof n !== "number" || n < 0 || n > 6 || !Number.isInteger(n)) {
    return null;
  }
  return n as Weekday;
}

function asRange(raw: unknown): TimeRange | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as { start?: unknown; end?: unknown };
  if (typeof r.start !== "string" || typeof r.end !== "string") return null;
  if (!/^\d{2}:\d{2}$/.test(r.start) || !/^\d{2}:\d{2}$/.test(r.end)) {
    return null;
  }
  return { start: r.start, end: r.end };
}

/**
 * Firestore schedule for a specialist (one doc per specialistId).
 */
export class AdminAvailabilityRepository {
  private async db() {
    return getAdminFirestore();
  }

  async getBySpecialistId(
    specialistId: string,
  ): Promise<SpecialistScheduleDoc | null> {
    const snap = await (await this.db())
      .collection(COLLECTION)
      .doc(specialistId)
      .get();
    if (!snap.exists) return null;
    const data = snap.data() ?? {};
    const workdays = Array.isArray(data.workdays)
      ? data.workdays
          .map(asWeekday)
          .filter((d): d is Weekday => d !== null)
      : [...DEFAULT_SCHEDULE.workdays];
    const ranges = Array.isArray(data.ranges)
      ? data.ranges.map(asRange).filter((r): r is TimeRange => r !== null)
      : [...DEFAULT_SCHEDULE.ranges];

    return {
      specialistId,
      timezone:
        typeof data.timezone === "string" && data.timezone
          ? data.timezone
          : "Europe/Madrid",
      workdays,
      ranges,
      createdAt:
        data.createdAt && typeof data.createdAt.toDate === "function"
          ? data.createdAt.toDate()
          : new Date(),
      updatedAt:
        data.updatedAt && typeof data.updatedAt.toDate === "function"
          ? data.updatedAt.toDate()
          : new Date(),
    };
  }

  async getConfigOrDefault(specialistId: string): Promise<ScheduleConfig> {
    const saved = await this.getBySpecialistId(specialistId);
    if (!saved || saved.workdays.length === 0 || saved.ranges.length === 0) {
      return DEFAULT_SCHEDULE;
    }
    return { workdays: saved.workdays, ranges: saved.ranges };
  }

  async upsert(input: {
    specialistId: string;
    timezone: string;
    workdays: Weekday[];
    ranges: TimeRange[];
  }): Promise<SpecialistScheduleDoc> {
    const ref = (await this.db()).collection(COLLECTION).doc(input.specialistId);
    const existing = await ref.get();
    await ref.set(
      {
        specialistId: input.specialistId,
        timezone: input.timezone,
        workdays: input.workdays,
        ranges: input.ranges,
        updatedAt: FieldValue.serverTimestamp(),
        ...(existing.exists
          ? {}
          : { createdAt: FieldValue.serverTimestamp() }),
      },
      { merge: true },
    );
    const next = await this.getBySpecialistId(input.specialistId);
    if (!next) throw new Error("Failed to save schedule");
    return next;
  }
}
