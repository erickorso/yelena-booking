import { NextResponse } from "next/server";
import { isAuthError, requireAuth } from "@/lib/auth/requireAuth";
import { GoogleCalendarService } from "@/services/googleCalendarService";

/**
 * GET /api/integrations/google/connect
 * Returns Google OAuth URL for the authenticated specialist.
 */
export async function GET(request: Request) {
  const auth = await requireAuth(request, ["especialista", "admin"]);
  if (isAuthError(auth)) return auth;

  const gcal = new GoogleCalendarService();
  if (!gcal.isConfigured()) {
    return NextResponse.json(
      { error: "Google Calendar is not configured on the server" },
      { status: 503 },
    );
  }

  try {
    const url = gcal.getConnectUrl(auth.uid);
    return NextResponse.json({ url });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to start Google OAuth";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
