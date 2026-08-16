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

## Consistency policy (booking saga + outbox)

1. **Commit** appointment row in Firestore (source of truth) with `clinicId`.
2. **Enqueue** `outboxJobs` (`appointment.google_sync`, `appointment.mail_booked`) with dedupe keys.
3. **Inline drain** a few jobs for UX (Meet link), then **Vercel Cron** retries with exponential backoff → **dead letter** after max attempts.
4. **Reconcile cron** re-queues confirmed appointments missing Google event / unfinished mail.

`POST /api/appointments` accepts **`Idempotency-Key`**: same key + body replays the stored response; different body → 409.

Custom clinical fields use a **soft-delete → purge values → hard-remove** saga in the DELETE handler.

## Multi-tenant (light)

Default `clinicId = yelena`. Optional claim `clinicId` on the ID token; appointments are stamped and list endpoints filter by actor clinic. Migrations live in `scripts/migrations/` + `_meta/schemaVersion`.

## Capabilities (“acting as”)

See `src/types/domain/capabilities.ts`. One Firebase user may be patient + specialist; checks use explicit capabilities (`book_self`, `book_on_behalf`, …).

## Observability

- Every API response should echo `x-request-id`.
- Server logs are single JSON lines (`logServer`) for Vercel drains.
- `reportError` on the client is the hook point for Sentry (`SENTRY_DSN`).
- Cron: `/api/cron/outbox` (*/5), `/api/cron/reconcile` (hourly) — `Authorization: Bearer CRON_SECRET`.

## Edge middleware

`yelena_session` cookie (set on client login) soft-gates `/dashboard/*`. Real auth remains Bearer ID token on APIs + Firestore rules — defense in depth, not a replacement.
