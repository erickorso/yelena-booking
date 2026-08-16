import { NextResponse } from "next/server";
import { isAuthError, requireAuth } from "@/lib/auth/requireAuth";
import {
  computeSpecialistDaySlots,
  isYmd,
} from "@/lib/availability/specialistDaySlots";
import { parseDateInput } from "@/lib/availability/defaultSlots";

export const runtime = "nodejs";

/**
 * GET /api/specialists/[id]/slots?date=YYYY-MM-DD
 * Free slots for an active specialist (schedule + Google FreeBusy).
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "Missing specialist id" }, { status: 400 });
  }

  const dateParam = new URL(request.url).searchParams.get("date");
  if (!dateParam || !parseDateInput(dateParam)) {
    return NextResponse.json(
      { error: "date=YYYY-MM-DD is required" },
      { status: 400 },
    );
  }
  const dayYmd = isYmd(dateParam) ? dateParam : dateParam.slice(0, 10);

  try {
    const result = await computeSpecialistDaySlots({
      specialistUserId: id,
      dayYmd,
      patientId: auth.uid,
    });
    if (!result) {
      return NextResponse.json(
        { error: "Specialist not active" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      specialistId: id,
      date: dateParam,
      slotMinutes: result.slotMinutes,
      schedule: result.schedule,
      googleBusyCount: result.googleBusyCount,
      slots: result.slots,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load slots";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
