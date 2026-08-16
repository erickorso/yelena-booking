"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { User } from "firebase/auth";
import type { AuthRole } from "@/types/domain";
import {
  bootstrapSession,
  clearPendingBootstrap,
  getIdToken,
  getRoleClaim,
  readPendingBootstrap,
  reloadUser,
  requiresEmailVerification,
  resendEmailVerification,
  savePendingBootstrap,
  signInWithEmail,
  signInWithGoogle,
  signOut as authSignOut,
  signUpWithEmail,
  subscribeToAuth,
  type BootstrapPayload,
} from "@/services/authService";
import { isFirebaseClientConfigured } from "@/lib/firebase/client";
import {
  isPlaceholderDisplayName,
  resolveDisplayName,
} from "@/lib/auth/displayName";

export type AuthStatus =
  | "loading"
  | "authenticated"
  | "anonymous"
  | "unverified";

type AuthContextValue = {
  status: AuthStatus;
  user: User | null;
  role: AuthRole | null;
  error: string | null;
  clearError: () => void;
  registerWithEmail: (
    input: {
      email: string;
      password: string;
      displayName: string;
      continueUrl: string;
    } & BootstrapPayload,
  ) => Promise<void>;
  loginWithEmail: (input: {
    email: string;
    password: string;
  }) => Promise<AuthRole | null>;
  loginWithGoogle: (bootstrap?: BootstrapPayload) => Promise<AuthRole | null>;
  logout: () => Promise<void>;
  refreshRole: () => Promise<void>;
  refreshEmailVerification: () => Promise<boolean>;
  resendVerification: (continueUrl: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function resolveAuthenticatedUser(nextUser: User): Promise<{
  status: AuthStatus;
  role: AuthRole | null;
}> {
  if (requiresEmailVerification(nextUser)) {
    return { status: "unverified", role: null };
  }

  let nextRole = await getRoleClaim(nextUser);
  if (!nextRole) {
    const pending = readPendingBootstrap();
    if (pending) {
      await bootstrapSession(nextUser, pending);
      nextRole = pending.role;
    }
  } else {
    clearPendingBootstrap();
  }

  return { status: "authenticated", role: nextRole };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const firebaseReady = isFirebaseClientConfigured();
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AuthRole | null>(null);
  const [status, setStatus] = useState<AuthStatus>(
    firebaseReady ? "loading" : "anonymous",
  );
  const [error, setError] = useState<string | null>(null);

  const refreshRole = useCallback(async () => {
    if (!user) {
      setRole(null);
      return;
    }
    const nextRole = await getRoleClaim(user);
    setRole(nextRole);
  }, [user]);

  useEffect(() => {
    if (!firebaseReady) {
      return;
    }

    return subscribeToAuth((nextUser) => {
      void (async () => {
        setUser(nextUser);
        if (!nextUser) {
          setRole(null);
          setStatus("anonymous");
          return;
        }
        try {
          const resolved = await resolveAuthenticatedUser(nextUser);
          setRole(resolved.role);
          setStatus(resolved.status);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Auth error");
          setRole(null);
          setStatus(
            requiresEmailVerification(nextUser) ? "unverified" : "authenticated",
          );
        }
      })();
    });
  }, [firebaseReady]);

  const clearError = useCallback(() => setError(null), []);

  const registerWithEmail = useCallback(
    async (
      input: {
        email: string;
        password: string;
        displayName: string;
        continueUrl: string;
      } & BootstrapPayload,
    ) => {
      setError(null);
      const created = await signUpWithEmail({
        email: input.email,
        password: input.password,
        displayName: input.displayName,
        continueUrl: input.continueUrl,
      });
      savePendingBootstrap({
        role: input.role,
        displayName: input.displayName,
        locale: input.locale,
        specialty: input.specialty,
        licenseNumber: input.licenseNumber,
        bio: input.bio,
        location: input.location,
      });
      setUser(created);
      setRole(null);
      setStatus("unverified");
    },
    [],
  );

  const loginWithEmail = useCallback(
    async (input: { email: string; password: string }) => {
      setError(null);
      const signedIn = await signInWithEmail(input);
      const resolved = await resolveAuthenticatedUser(signedIn);
      setUser(signedIn);
      setRole(resolved.role);
      setStatus(resolved.status);
      if (resolved.status === "unverified") {
        throw new Error("EMAIL_NOT_VERIFIED");
      }
      return resolved.role;
    },
    [],
  );

  const loginWithGoogle = useCallback(async (bootstrap?: BootstrapPayload) => {
    setError(null);
    const signedIn = await signInWithGoogle();
    let nextRole = await getRoleClaim(signedIn);
    const googleName = signedIn.displayName?.trim() || "";

    if (!nextRole && bootstrap) {
      const payload: BootstrapPayload = {
        ...bootstrap,
        displayName: resolveDisplayName({
          preferred: bootstrap.displayName,
          googleName,
          email: signedIn.email,
        }),
      };
      await bootstrapSession(signedIn, payload);
      nextRole = payload.role;
    } else if (nextRole && googleName) {
      try {
        const token = await getIdToken(signedIn, true);
        const meRes = await fetch("/api/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const me = (await meRes.json()) as { displayName?: string };
        if (meRes.ok && isPlaceholderDisplayName(me.displayName ?? null)) {
          await fetch("/api/me", {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ displayName: googleName }),
          });
          if (typeof window !== "undefined") {
            window.dispatchEvent(
              new CustomEvent("yelena:profile-updated", {
                detail: { displayName: googleName },
              }),
            );
          }
        }
      } catch {
        // Non-blocking sync.
      }
    }

    setUser(signedIn);
    setRole(nextRole);
    setStatus("authenticated");
    return nextRole;
  }, []);

  const logout = useCallback(async () => {
    setError(null);
    await authSignOut();
    setRole(null);
    setUser(null);
    setStatus("anonymous");
  }, []);

  const refreshEmailVerification = useCallback(async () => {
    if (!user) return false;
    const refreshed = await reloadUser(user);
    setUser(refreshed);
    if (requiresEmailVerification(refreshed)) {
      setStatus("unverified");
      setRole(null);
      return false;
    }
    const resolved = await resolveAuthenticatedUser(refreshed);
    setRole(resolved.role);
    setStatus(resolved.status);
    return resolved.status === "authenticated";
  }, [user]);

  const resendVerification = useCallback(
    async (continueUrl: string) => {
      if (!user) throw new Error("Not signed in");
      await resendEmailVerification(user, continueUrl);
    },
    [user],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      role,
      error,
      clearError,
      registerWithEmail,
      loginWithEmail,
      loginWithGoogle,
      logout,
      refreshRole,
      refreshEmailVerification,
      resendVerification,
    }),
    [
      status,
      user,
      role,
      error,
      clearError,
      registerWithEmail,
      loginWithEmail,
      loginWithGoogle,
      logout,
      refreshRole,
      refreshEmailVerification,
      resendVerification,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
