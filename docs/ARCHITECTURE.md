# Architecture notes (portfolio / ops)

## Layers

```text
UI (organisms) → BFF route handlers → application use-cases → services → repositories → Firestore/Blob
                                      ↑
                               contracts/ (Zod) at the HTTP edge
```

- **Route handlers** authenticate, parse with Zod, call one use-case, map errors → JSON + `x-request-id`.
- **Application** owns authz capabilities + domain orchestration (e.g. `bookAppointment`).
- **Services** wrap single aggregates (appointments FSM, mail templates, uploads).
- **Repositories** are the only place that touch Firestore Admin.

## Consistency policy (side-effects)

Booking is intentionally a **saga**, not a distributed transaction:

1. **Commit** appointment row in Firestore (source of truth).
2. **Best-effort** Google Calendar event + Meet.
3. **Best-effort** Resend email.

If (2) or (3) fail, the API still returns `200` with `googleSynced` / `mailSent` flags so the UI can warn. Retry is idempotent enough for Calendar (keyed by appointment id in description/metadata) and mail is informational.

Custom clinical fields use a **soft-delete → purge values → hard-remove** saga documented in the DELETE handler.

## Capabilities (“acting as”)

See `src/types/domain/capabilities.ts`. One Firebase user may be patient + specialist; checks use explicit capabilities (`book_self`, `book_on_behalf`, …) instead of ad-hoc role `if`s where possible.

## Observability

- Every API response should echo `x-request-id`.
- Server logs are single JSON lines (`logServer`) for Vercel drains.
- `reportError` on the client is the hook point for Sentry (`SENTRY_DSN`).

## Edge middleware

`yelena_session` cookie (set on client login) soft-gates `/dashboard/*`. Real auth remains Bearer ID token on APIs + Firestore rules — defense in depth, not a replacement.
