import "server-only";

import { google } from "googleapis";
import type { Credentials } from "google-auth-library";
import {
  getGoogleClientId,
  getGoogleClientSecret,
  getGoogleOAuthStateSecret,
  getGoogleRedirectUri,
  GOOGLE_CALENDAR_SCOPES,
  isGoogleCalendarConfigured,
} from "@/lib/google/config";
import { signOAuthState, verifyOAuthState } from "@/lib/google/oauthState";
import { AdminGoogleCalendarRepository } from "@/repositories/firestore/AdminGoogleCalendarRepository";
import type {
  GoogleBusyInterval,
  GoogleCreatedEvent,
} from "@/types/domain";
import { formatGoogleDateTime } from "@/lib/availability/scheduleTimeZone";

function createOAuthClient() {
  return new google.auth.OAuth2(
    getGoogleClientId(),
    getGoogleClientSecret(),
    getGoogleRedirectUri(),
  );
}

function credentialsFromConn(conn: {
  accessToken: string;
  refreshToken: string;
  expiryDate: number | null;
}): Credentials {
  return {
    access_token: conn.accessToken || undefined,
    refresh_token: conn.refreshToken || undefined,
    expiry_date: conn.expiryDate ?? undefined,
  };
}

/**
 * Google Calendar sync: OAuth, FreeBusy, and Meet events for specialists.
 */
export class GoogleCalendarService {
  constructor(
    private readonly repo = new AdminGoogleCalendarRepository(),
  ) {}

  isConfigured(): boolean {
    return isGoogleCalendarConfigured();
  }

  getConnectUrl(specialistId: string): string {
    if (!this.isConfigured()) {
      throw new Error("Google Calendar is not configured");
    }
    const client = createOAuthClient();
    const state = signOAuthState(specialistId, getGoogleOAuthStateSecret());
    return client.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: [...GOOGLE_CALENDAR_SCOPES],
      state,
      include_granted_scopes: true,
    });
  }

  async handleOAuthCallback(
    code: string,
    state: string,
  ): Promise<{ specialistId: string; googleEmail: string | null }> {
    if (!this.isConfigured()) {
      throw new Error("Google Calendar is not configured");
    }
    const verified = verifyOAuthState(state, getGoogleOAuthStateSecret());
    if (!verified.ok) throw new Error(verified.error);

    const client = createOAuthClient();
    const { tokens } = await client.getToken(code);
    if (!tokens.access_token && !tokens.refresh_token) {
      throw new Error("Google did not return tokens");
    }

    client.setCredentials(tokens);
    let googleEmail: string | null = null;
    try {
      const oauth2 = google.oauth2({ version: "v2", auth: client });
      const me = await oauth2.userinfo.get();
      googleEmail = me.data.email ?? null;
    } catch {
      googleEmail = null;
    }

    const existing = await this.repo.get(verified.uid);
    const refreshToken =
      tokens.refresh_token || existing?.refreshToken || "";
    if (!refreshToken) {
      throw new Error("Missing refresh_token — reconnect with consent");
    }

    await this.repo.upsert({
      specialistId: verified.uid,
      googleEmail,
      accessToken: tokens.access_token ?? existing?.accessToken ?? "",
      refreshToken,
      expiryDate: tokens.expiry_date ?? null,
      calendarId: "primary",
    });

    return { specialistId: verified.uid, googleEmail };
  }

  async getStatus(specialistId: string): Promise<{
    configured: boolean;
    connected: boolean;
    googleEmail: string | null;
  }> {
    const configured = this.isConfigured();
    if (!configured) {
      return { configured: false, connected: false, googleEmail: null };
    }
    const conn = await this.repo.get(specialistId);
    return {
      configured: true,
      connected: Boolean(conn?.refreshToken),
      googleEmail: conn?.googleEmail ?? null,
    };
  }

  async disconnect(specialistId: string): Promise<void> {
    const conn = await this.repo.get(specialistId);
    if (conn) {
      try {
        const client = createOAuthClient();
        client.setCredentials(credentialsFromConn(conn));
        if (conn.accessToken) {
          await client.revokeToken(conn.accessToken);
        }
      } catch {
        // Best-effort revoke; still delete local tokens.
      }
      await this.repo.delete(specialistId);
    }
  }

  async listBusy(
    specialistId: string,
    timeMin: Date,
    timeMax: Date,
    timeZone?: string,
  ): Promise<GoogleBusyInterval[]> {
    const auth = await this.getAuthedClient(specialistId);
    if (!auth) return [];

    const calendar = google.calendar({ version: "v3", auth: auth.client });
    const res = await calendar.freebusy.query({
      requestBody: {
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        timeZone: timeZone?.trim() || undefined,
        items: [{ id: auth.conn.calendarId }],
      },
    });

    const busy =
      res.data.calendars?.[auth.conn.calendarId]?.busy ?? [];
    return busy
      .map((b) => {
        if (!b.start || !b.end) return null;
        const startsAt = new Date(b.start);
        const endsAt = new Date(b.end);
        if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
          return null;
        }
        return { startsAt, endsAt };
      })
      .filter((x): x is GoogleBusyInterval => x !== null);
  }

  async hasConflict(
    specialistId: string,
    startsAt: Date,
    endsAt: Date,
    timeZone?: string,
  ): Promise<boolean> {
    const paddingMs = 60_000;
    const busy = await this.listBusy(
      specialistId,
      new Date(startsAt.getTime() - paddingMs),
      new Date(endsAt.getTime() + paddingMs),
      timeZone,
    );
    return busy.some((b) => startsAt < b.endsAt && b.startsAt < endsAt);
  }

  async createAppointmentEvent(input: {
    specialistId: string;
    appointmentId: string;
    summary: string;
    description?: string;
    startsAt: Date;
    endsAt: Date;
    /** IANA TZ for the specialist calendar wall-clock (e.g. Europe/Madrid). */
    timeZone: string;
    attendeeEmail?: string | null;
  }): Promise<GoogleCreatedEvent | null> {
    const auth = await this.getAuthedClient(input.specialistId);
    if (!auth) return null;

    const calendar = google.calendar({ version: "v3", auth: auth.client });
    const attendees =
      input.attendeeEmail && input.attendeeEmail.includes("@")
        ? [{ email: input.attendeeEmail }]
        : undefined;

    const tz = input.timeZone.trim() || "UTC";
    const res = await calendar.events.insert({
      calendarId: auth.conn.calendarId,
      conferenceDataVersion: 1,
      sendUpdates: attendees ? "all" : "none",
      requestBody: {
        summary: input.summary,
        description: input.description ?? undefined,
        start: {
          dateTime: formatGoogleDateTime(input.startsAt, tz),
          timeZone: tz,
        },
        end: {
          dateTime: formatGoogleDateTime(input.endsAt, tz),
          timeZone: tz,
        },
        attendees,
        conferenceData: {
          createRequest: {
            requestId: input.appointmentId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 64) ||
              `yelena${Date.now()}`,
            conferenceSolutionKey: { type: "hangoutsMeet" },
          },
        },
      },
    });

    const eventId = res.data.id;
    if (!eventId) return null;

    const meetLink =
      res.data.hangoutLink ??
      res.data.conferenceData?.entryPoints?.find(
        (e) => e.entryPointType === "video",
      )?.uri ??
      null;

    return {
      eventId,
      meetLink,
      calendarId: auth.conn.calendarId,
      htmlLink: res.data.htmlLink ?? null,
    };
  }

  private async getAuthedClient(specialistId: string) {
    if (!this.isConfigured()) return null;
    const conn = await this.repo.get(specialistId);
    if (!conn?.refreshToken) return null;

    const client = createOAuthClient();
    client.setCredentials(credentialsFromConn(conn));

    try {
      await client.getAccessToken();
    } catch {
      return null;
    }

    const creds = client.credentials;
    if (
      creds.access_token &&
      (creds.access_token !== conn.accessToken ||
        (creds.expiry_date ?? null) !== conn.expiryDate)
    ) {
      await this.repo.updateTokens(specialistId, {
        accessToken: creds.access_token,
        refreshToken: creds.refresh_token ?? undefined,
        expiryDate: creds.expiry_date ?? null,
      });
    }

    return { client, conn };
  }
}
