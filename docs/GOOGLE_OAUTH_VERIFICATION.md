# Google OAuth verification — paste helpers

**App homepage:** `https://yelena-booking.vercel.app`  
**Privacy policy:** `https://yelena-booking.vercel.app/es/privacy`  
**Authorized redirect:** `https://yelena-booking.vercel.app/api/integrations/google/callback`

## Scopes (sensitive)

- `https://www.googleapis.com/auth/calendar.events`  
  Create/update/delete calendar events for clinic appointments (incl. Meet link when applicable). Only after the specialist explicitly connects Google Calendar.
- `https://www.googleapis.com/auth/calendar.freebusy`  
  Read busy/free intervals so patients cannot book over existing Google events.

## Justification (EN — paste into Google form)

Thaydee Elena is a medical appointment booking app. Specialists optionally connect Google Calendar so the clinic can:

1. Check FreeBusy when offering bookable slots (avoid double-booking).
2. Create a Calendar event when an appointment is booked, and update/cancel it when the appointment changes.

We do not read email, contacts, or Drive. Tokens are stored server-side and used only for that specialist’s booking workflow. The specialist can disconnect at any time from the app.

## Demo video checklist

Record 2–3 min screen capture:

1. Login as specialist on `yelena-booking.vercel.app`
2. Open schedule / Google Calendar connect
3. OAuth consent → allow
4. Show connected state + privacy note
5. Book a slot (or show FreeBusy blocking) and resulting Google event
6. Disconnect Google Calendar

## Domain note

`*.vercel.app` works for Testing and as Application home / Privacy URLs.  
For Branding domain verification and smoother sensitive-scope approval, prefer a **custom domain you own** (Search Console verify). You cannot verify `vercel.app` itself.
