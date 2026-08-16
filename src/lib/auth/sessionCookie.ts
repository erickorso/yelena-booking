/** Soft session marker for edge middleware (not a security token). */
export const SESSION_COOKIE = "yelena_session";

export function markClientSession(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${SESSION_COOKIE}=1; path=/; SameSite=Lax; max-age=${60 * 60 * 24 * 30}`;
}

export function clearClientSession(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${SESSION_COOKIE}=; path=/; SameSite=Lax; max-age=0`;
}
