# Ops · Quality · Privacy (roadmap to 9/10)

## Staging
- Prefer `E2E_BASE_URL` pointing to a staging deploy (not only prod).
- Seed accounts only on staging; rotate passwords out of docs for prod.

## Observability
- Set `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` and wire `@sentry/nextjs`.
- Until then, `reportError()` logs structured errors (`src/lib/observability/reportError.ts`).

## Mail
- Verify a custom domain in Resend and set `MAIL_FROM` (avoid `onboarding@resend.dev` for real patients).

## Privacy / RGPD checklist
- [ ] Privacy policy page kept current (`/privacy`)
- [ ] Document retention for clinical charts & medical files
- [ ] Patient export / deletion request path
- [ ] Access audit for PHI (who viewed/edited charts)
- [ ] Encrypt at rest (Firebase + Blob defaults) documented for clinic

## Tests
- Unit coverage gate: `npm run test:coverage`
- E2E roles + booking attempt: `npm run test:e2e`
- Expand API ownership tests before claiming 9/10 on architecture
