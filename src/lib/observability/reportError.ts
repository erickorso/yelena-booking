/**
 * Client/server helper: report unexpected errors without crashing UX.
 * Wire SENTRY_DSN later; until then logs to console in a stable shape.
 * Pass `requestId` in context when available (API / middleware echo).
 */
export function reportError(
  error: unknown,
  context?: Record<string, string | number | boolean | null | undefined>,
): void {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "Unknown error";
  const payload = {
    message,
    requestId: context?.requestId ?? null,
    context: context ?? {},
    at: new Date().toISOString(),
  };
  if (process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN) {
    // Placeholder until @sentry/nextjs is configured in the project.
    console.error("[observability:sentry-ready]", payload, error);
    return;
  }
  console.error("[observability]", payload, error);
}
