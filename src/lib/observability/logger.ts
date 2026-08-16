/**
 * Structured server logs (JSON line → Vercel / drain / future Sentry).
 */
export type LogLevel = "info" | "warn" | "error";

export function logServer(
  level: LogLevel,
  event: string,
  fields: Record<string, unknown> = {},
): void {
  const line = JSON.stringify({
    level,
    event,
    at: new Date().toISOString(),
    ...fields,
  });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.info(line);
}
