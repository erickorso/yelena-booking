import "server-only";

import { getAppBaseUrl } from "@/lib/mail/config";

export const GOOGLE_CALENDAR_SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.freebusy",
  "https://www.googleapis.com/auth/userinfo.email",
] as const;

export function isGoogleCalendarConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID?.trim() &&
      process.env.GOOGLE_CLIENT_SECRET?.trim(),
  );
}

export function getGoogleClientId(): string {
  return process.env.GOOGLE_CLIENT_ID?.trim() ?? "";
}

export function getGoogleClientSecret(): string {
  return process.env.GOOGLE_CLIENT_SECRET?.trim() ?? "";
}

export function getGoogleRedirectUri(): string {
  const explicit = process.env.GOOGLE_REDIRECT_URI?.trim();
  if (explicit) return explicit;
  return `${getAppBaseUrl()}/api/integrations/google/callback`;
}

/** HMAC secret for OAuth `state` (falls back to client secret). */
export function getGoogleOAuthStateSecret(): string {
  return (
    process.env.GOOGLE_OAUTH_STATE_SECRET?.trim() ||
    getGoogleClientSecret() ||
    "yelena-gcal-dev-state"
  );
}
