import { NextResponse } from "next/server";
import { isAuthError, requireAuth } from "@/lib/auth/requireAuth";
import { denyUnlessActiveSpecialist } from "@/lib/auth/requireActiveSpecialist";
import { AdminAvailabilityRepository } from "@/repositories/firestore/AdminAvailabilityRepository";
import {
  DEFAULT_SCHEDULE,
  hmToMinutes,
} from "@/lib/availability/defaultSlots";
import type { TimeRange, Weekday } from "@/types/domain";
import {
  DEFAULT_SLOT_MINUTES,
  isSlotDurationMinutes,
} from "@/types/domain";

/**
 * GET /api/specialists/me/schedule
 */
export async function GET(request: Request) {
  const auth = await requireAuth(request, ["especialista", "admin"]);
  if (isAuthError(auth)) return auth;

  const denied = await denyUnlessActiveSpecialist(auth.uid, auth.role);
  if (denied) return denied;

  try {
    const saved = await new AdminAvailabilityRepository().getBySpecialistId(
      auth.uid,
    );
    return NextResponse.json({
      schedule: saved
        ? {
            workdays: saved.workdays,
            ranges: saved.ranges,
            timezone: saved.timezone,
            slotMinutes: saved.slotMinutes,
          }
        : {
            workdays: DEFAULT_SCHEDULE.workdays,
            ranges: DEFAULT_SCHEDULE.ranges,
            timezone: "America/Caracas",
            slotMinutes: DEFAULT_SLOT_MINUTES,
            isDefault: true,
          },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load schedule";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * PUT /api/specialists/me/schedule
 * Body: { workdays, ranges, timezone?, slotMinutes? }
 */
export async function PUT(request: Request) {
  const auth = await requireAuth(request, ["especialista", "admin"]);
  if (isAuthError(auth)) return auth;

  const denied = await denyUnlessActiveSpecialist(auth.uid, auth.role);
  if (denied) return denied;

  let body: {
    workdays?: unknown;
    ranges?: unknown;
    timezone?: unknown;
    slotMinutes?: unknown;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!Array.isArray(body.workdays) || !Array.isArray(body.ranges)) {
    return NextResponse.json(
      { error: "workdays and ranges arrays are required" },
      { status: 400 },
    );
  }

  const workdays = body.workdays
    .filter((d): d is number => typeof d === "number" && d >= 0 && d <= 6)
    .map((d) => d as Weekday);
  const uniqueDays = [...new Set(workdays)].sort((a, b) => a - b);

  const ranges: TimeRange[] = [];
  for (const raw of body.ranges) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as { start?: unknown; end?: unknown };
    if (typeof r.start !== "string" || typeof r.end !== "string") continue;
    if (!/^\d{2}:\d{2}$/.test(r.start) || !/^\d{2}:\d{2}$/.test(r.end)) {
      return NextResponse.json(
        { error: "ranges must use HH:mm" },
        { status: 400 },
      );
    }
    if (hmToMinutes(r.start) >= hmToMinutes(r.end)) {
      return NextResponse.json(
        { error: "Each range end must be after start" },
        { status: 400 },
      );
    }
    ranges.push({ start: r.start, end: r.end });
  }

  if (uniqueDays.length === 0) {
    return NextResponse.json(
      { error: "Select at least one workday" },
      { status: 400 },
    );
  }
  if (ranges.length === 0) {
    return NextResponse.json(
      { error: "Add at least one time range" },
      { status: 400 },
    );
  }

  const timezone =
    typeof body.timezone === "string" && body.timezone.trim()
      ? body.timezone.trim()
      : "America/Caracas";

  const slotMinutes = isSlotDurationMinutes(body.slotMinutes)
    ? body.slotMinutes
    : DEFAULT_SLOT_MINUTES;

  try {
    const saved = await new AdminAvailabilityRepository().upsert({
      specialistId: auth.uid,
      timezone,
      workdays: uniqueDays,
      ranges,
      slotMinutes,
    });
    return NextResponse.json({
      ok: true,
      schedule: {
        workdays: saved.workdays,
        ranges: saved.ranges,
        timezone: saved.timezone,
        slotMinutes: saved.slotMinutes,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to save schedule";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
