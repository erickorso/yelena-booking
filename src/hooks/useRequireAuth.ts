"use client";

import { useAuth } from "@/components/providers/AuthProvider";
import type { AuthRole } from "@/types/domain";

export function useRequireAuth(allowed?: AuthRole[]) {
  const auth = useAuth();
  const isAllowed =
    auth.status === "authenticated" &&
    (!allowed || (auth.role !== null && allowed.includes(auth.role)));

  return {
    ...auth,
    isAllowed,
    isLoading: auth.status === "loading",
  };
}
