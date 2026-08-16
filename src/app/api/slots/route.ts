import { NextResponse } from "next/server";
import { isAuthError, requireAuth } from "@/lib/auth/requireAuth";
import {
  computeSpecialistRangeSlots,
  isYmd,
} from "@/lib/availability/specialistDaySlots";
import { addDaysYmd } from "@/lib/availability/scheduleTimeZone";
import { AdminUserRepository } from "@/repositories/firestore/AdminUserRepository";

export const runtime = "nodejs";

type SlotSpecialist = {
  id: string;
  displayName: string;
  specialty: string;
};

type AggregatedSlot = {
  startsAt: string;
  endsAt: string;
  specialists: SlotSpecialist[];
};

/**
 * GET /api/slots?from=YYYY-MM-DD&to=YYYY-MM-DD
 * Union of free slots across active specialists (patient booking calendar).
 */
export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;

  const url = new URL(request.url);
  const from = url.searchParams.get("from") ?? "";
  const to = url.searchParams.get("to") ?? "";
  if (!isYmd(from) || !isYmd(to) || from > to) {
    return NextResponse.json(
      { error: "from and to (YYYY-MM-DD) are required" },
      { status: 400 },
    );
  }

  let span = 0;
  for (let cur = from; cur <= to; cur = addDaysYmd(cur, 1)) {
    span += 1;
    if (span > 14) {
      return NextResponse.json(
        { error: "Range cannot exceed 14 days" },
        { status: 400 },
      );
    }
  }

  try {
    const users = new AdminUserRepository();
    const active = await users.listActiveSpecialists();
    const candidates = active.filter((s) => s.userId !== auth.uid);

    const profiles = await Promise.all(
      candidates.map(async (s) => {
        const user = await users.getById(s.userId);
        return {
          id: s.userId,
          displayName: user?.displayName?.trim() || "Especialista",
          specialty: s.specialty,
        } satisfies SlotSpecialist;
      }),
    );

    const byKey = new Map<string, AggregatedSlot>();

    await Promise.all(
      profiles.map(async (profile) => {
        const result = await computeSpecialistRangeSlots({
          specialistUserId: profile.id,
          fromYmd: from,
          toYmd: to,
          patientId: auth.uid,
        });
        if (!result) return;
        for (const slot of result.slots) {
          const key = `${slot.startsAt}|${slot.endsAt}`;
          const existing = byKey.get(key);
          if (existing) {
            if (!existing.specialists.some((x) => x.id === profile.id)) {
              existing.specialists.push(profile);
            }
          } else {
            byKey.set(key, {
              startsAt: slot.startsAt,
              endsAt: slot.endsAt,
              specialists: [profile],
            });
          }
        }
      }),
    );

    const slots = [...byKey.values()].sort(
      (a, b) =>
        new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
    );

    return NextResponse.json({ from, to, slots });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load slots";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
