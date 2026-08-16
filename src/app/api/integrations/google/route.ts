import { NextResponse } from "next/server";
import { isAuthError, requireAuth } from "@/lib/auth/requireAuth";
import { GoogleCalendarService } from "@/services/googleCalendarService";

/**
 * GET /api/integrations/google — connection status for the specialist.
 * DELETE /api/integrations/google — disconnect / revoke.
 */
export async function GET(request: Request) {
  const auth = await requireAuth(request, ["especialista", "admin"]);
  if (isAuthError(auth)) return auth;

  try {
    const status = await new GoogleCalendarService().getStatus(auth.uid);
    return NextResponse.json(status);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load Google status";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const auth = await requireAuth(request, ["especialista", "admin"]);
  if (isAuthError(auth)) return auth;

  try {
    await new GoogleCalendarService().disconnect(auth.uid);
    return NextResponse.json({ ok: true, connected: false });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to disconnect Google";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
