import { NextResponse } from "next/server";
import { getAppBaseUrl } from "@/lib/mail/config";
import { GoogleCalendarService } from "@/services/googleCalendarService";

/**
 * GET /api/integrations/google/callback?code=&state=
 * OAuth redirect from Google — persists tokens and returns to specialist panel.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");
  const base = getAppBaseUrl();
  const dashboard = `${base}/es/dashboard/specialist`;

  if (oauthError) {
    return NextResponse.redirect(
      `${dashboard}?gcal=error&reason=${encodeURIComponent(oauthError)}`,
    );
  }
  if (!code || !state) {
    return NextResponse.redirect(`${dashboard}?gcal=error&reason=missing_code`);
  }

  try {
    await new GoogleCalendarService().handleOAuthCallback(code, state);
    return NextResponse.redirect(`${dashboard}?gcal=connected`);
  } catch (error) {
    const reason =
      error instanceof Error ? error.message : "callback_failed";
    return NextResponse.redirect(
      `${dashboard}?gcal=error&reason=${encodeURIComponent(reason)}`,
    );
  }
}
