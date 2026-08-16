/** Persisted OAuth connection for a specialist's Google Calendar. */
export interface GoogleCalendarConnection {
  specialistId: string;
  googleEmail: string | null;
  accessToken: string;
  refreshToken: string;
  expiryDate: number | null;
  calendarId: string;
  connectedAt: Date;
  updatedAt: Date;
}

export type GoogleBusyInterval = {
  startsAt: Date;
  endsAt: Date;
};

export type GoogleCreatedEvent = {
  eventId: string;
  meetLink: string | null;
  calendarId: string;
  htmlLink: string | null;
};
