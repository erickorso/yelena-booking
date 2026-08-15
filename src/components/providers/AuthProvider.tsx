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
  getRoleClaim,
  signInWithEmail,
  signInWithGoogle,
  signOut as authSignOut,
  signUpWithEmail,
  subscribeToAuth,
  type BootstrapPayload,
} from "@/services/authService";
import { isFirebaseClientConfigured } from "@/lib/firebase/client";

export type AuthStatus = "loading" | "authenticated" | "anonymous";

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
    } & BootstrapPayload,
  ) => Promise<void>;
  loginWithEmail: (input: {
    email: string;
    password: string;
  }) => Promise<AuthRole | null>;
  loginWithGoogle: (bootstrap?: BootstrapPayload) => Promise<AuthRole | null>;
  logout: () => Promise<void>;
  refreshRole: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

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

    return subscribeToAuth(async (nextUser) => {
      setUser(nextUser);
      if (!nextUser) {
        setRole(null);
        setStatus("anonymous");
        return;
      }
      const nextRole = await getRoleClaim(nextUser);
      setRole(nextRole);
      setStatus("authenticated");
    });
  }, [firebaseReady]);

  const clearError = useCallback(() => setError(null), []);

  const registerWithEmail = useCallback(
    async (
      input: {
        email: string;
        password: string;
        displayName: string;
      } & BootstrapPayload,
    ) => {
      setError(null);
      const created = await signUpWithEmail({
        email: input.email,
        password: input.password,
        displayName: input.displayName,
      });
      await bootstrapSession(created, {
        role: input.role,
        displayName: input.displayName,
        locale: input.locale,
        specialty: input.specialty,
        licenseNumber: input.licenseNumber,
        bio: input.bio,
        location: input.location,
      });
      setRole(input.role);
    },
    [],
  );

  const loginWithEmail = useCallback(
    async (input: { email: string; password: string }) => {
      setError(null);
      const signedIn = await signInWithEmail(input);
      const nextRole = await getRoleClaim(signedIn);
      setRole(nextRole);
      return nextRole;
    },
    [],
  );

  const loginWithGoogle = useCallback(async (bootstrap?: BootstrapPayload) => {
    setError(null);
    const signedIn = await signInWithGoogle();
    let nextRole = await getRoleClaim(signedIn);
    if (!nextRole && bootstrap) {
      await bootstrapSession(signedIn, bootstrap);
      nextRole = bootstrap.role;
    }
    setRole(nextRole);
    return nextRole;
  }, []);

  const logout = useCallback(async () => {
    setError(null);
    await authSignOut();
    setRole(null);
  }, []);

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
