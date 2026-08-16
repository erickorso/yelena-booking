/**
 * Placeholder names used when Google sign-up omitted a real display name.
 */
export function isPlaceholderDisplayName(name: string | null | undefined): boolean {
  if (!name || !name.trim()) return true;
  const n = name.trim().toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
  return (
    n === "usuario thaydee elena" ||
    n === "usuario yelena" ||
    n.startsWith("usuario thaydee") ||
    n.startsWith("usuario yelena") ||
    n === "usuario"
  );
}

/**
 * Prefer typed name (if real), else Google/profile name, else email local-part.
 */
export function resolveDisplayName(input: {
  preferred?: string | null;
  googleName?: string | null;
  email?: string | null;
}): string {
  const preferred = input.preferred?.trim() || "";
  const googleName = input.googleName?.trim() || "";
  if (preferred && !isPlaceholderDisplayName(preferred)) return preferred;
  if (googleName) return googleName;
  if (preferred) return preferred;
  const local = input.email?.split("@")[0]?.trim();
  return local || "Usuario";
}
