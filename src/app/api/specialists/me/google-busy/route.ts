import { NextResponse } from "next/server";
import { isAuthError, requireAuth } from "@/lib/auth/requireAuth";
import { resolveScheduleTimezone } from "@/lib/availability/defaultSlots";
import { AdminAvailabilityRepository } from "@/repositories/firestore/AdminAvailabilityRepository";
import { AdminUserRepository } from "@/repositories/firestore/AdminUserRepository";
import { GoogleCalendarService } from "@/services/googleCalendarService";

/**
 * GET /api/specialists/me/google-busy?timeMin=&timeMax=
 * FreeBusy from the connected Google Calendar (absolute UTC intervals).
 */
export async function GET(request: Request) {
  const auth = await requireAuth(request, ["especialista", "admin"]);
  if (isAuthError(auth)) return auth;

  const url = new URL(request.url);
  const timeMinRaw = url.searchParams.get("timeMin");
  const timeMaxRaw = url.searchParams.get("timeMax");
  const timeMin = timeMinRaw ? new Date(timeMinRaw) : null;
  const timeMax = timeMaxRaw ? new Date(timeMaxRaw) : null;
  if (
    !timeMin ||
    !timeMax ||
    Number.isNaN(timeMin.getTime()) ||
    Number.isNaN(timeMax.getTime()) ||
    timeMax <= timeMin
  ) {
    return NextResponse.json(
      { error: "timeMin and timeMax ISO datetimes are required" },
      { status: 400 },
    );
  }

  try {
    if (auth.role === "especialista") {
      const me = await new AdminUserRepository().getSpecialistByUserId(auth.uid);
      if (!me || me.status !== "active") {
        return NextResponse.json(
          { error: "Specialist must be active" },
          { status: 403 },
        );
      }
    }

    const schedule = await new AdminAvailabilityRepository().getConfigOrDefault(
      auth.uid,
    );
    const timeZone = resolveScheduleTimezone(schedule);
    const gcal = new GoogleCalendarService();
    const status = await gcal.getStatus(auth.uid);
    if (!status.connected) {
      return NextResponse.json({
        connected: false,
        timeZone,
        busy: [] as { startsAt: string; endsAt: string }[],
      });
    }

    const busy = await gcal.listBusy(auth.uid, timeMin, timeMax, timeZone);
    return NextResponse.json({
      connected: true,
      timeZone,
      busy: busy.map((b) => ({
        startsAt: b.startsAt.toISOString(),
        endsAt: b.endsAt.toISOString(),
      })),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load Google busy";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
