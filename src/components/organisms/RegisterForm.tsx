"use client";

import { useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/atoms/Button";
import { SpecialtyPicker } from "@/components/molecules/SpecialtyPicker";
import { Input } from "@/components/atoms/Input";
import { useAuth } from "@/components/providers/AuthProvider";
import { Link, useRouter } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { mapFirebaseAuthErrorKey } from "@/lib/auth/firebaseAuthErrors";

type RegisterRole = "paciente" | "especialista";

function dashboardPath(role: RegisterRole): string {
  return role === "especialista" ? "/dashboard/specialist" : "/dashboard/patient";
}

export function RegisterForm() {
  const t = useTranslations("Auth");
  const locale = useLocale() as AppLocale;
  const router = useRouter();
  const { registerWithEmail, loginWithGoogle } = useAuth();

  const [role, setRole] = useState<RegisterRole>("paciente");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function friendlyError(err: unknown): string {
    return t(`errors.${mapFirebaseAuthErrorKey(err)}`);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const continueUrl = `${window.location.origin}/${locale}/login`;
      await registerWithEmail({
        email,
        password,
        displayName,
        role,
        locale,
        continueUrl,
        specialty: role === "especialista" ? specialty : undefined,
        licenseNumber: role === "especialista" ? licenseNumber : undefined,
      });
      router.push("/verify-email");
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setPending(false);
    }
  }

  async function onGoogle() {
    if (role === "especialista" && (!specialty.trim() || !licenseNumber.trim())) {
      setError(t("errors.specialistFields"));
      return;
    }
    setPending(true);
    setError(null);
    try {
      await loginWithGoogle({
        role,
        displayName: displayName.trim(),
        locale,
        specialty: role === "especialista" ? specialty : undefined,
        licenseNumber: role === "especialista" ? licenseNumber : undefined,
      });
      router.push(dashboardPath(role));
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md space-y-6">
      <div>
        <h1 className="font-serif text-3xl text-teal-800 dark:text-teal-300">
          {t("registerTitle")}
        </h1>
        <p className="mt-2 text-sm text-stone-600 dark:text-slate-300">
          {t("registerSubtitle")}
        </p>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-stone-800 dark:text-slate-100">
          {t("roleLabel")}
        </legend>
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant={role === "paciente" ? "primary" : "secondary"}
            aria-pressed={role === "paciente"}
            onClick={() => setRole("paciente")}
          >
            {t("roles.paciente")}
          </Button>
          <Button
            type="button"
            size="sm"
            variant={role === "especialista" ? "primary" : "secondary"}
            aria-pressed={role === "especialista"}
            onClick={() => setRole("especialista")}
          >
            {t("roles.especialista")}
          </Button>
        </div>
      </fieldset>

      <form className="space-y-4" onSubmit={onSubmit} noValidate>
        <Input
          label={t("displayName")}
          name="displayName"
          required
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />
        <Input
          label={t("email")}
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          label={t("password")}
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {role === "especialista" ? (
          <>
            <SpecialtyPicker
              name="specialty"
              required
              value={specialty}
              onChange={setSpecialty}
            />
            <Input
              label={t("licenseNumber")}
              name="licenseNumber"
              required
              value={licenseNumber}
              onChange={(e) => setLicenseNumber(e.target.value)}
            />
          </>
        ) : null}
        {error ? (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        ) : null}
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? t("loading") : t("registerCta")}
        </Button>
      </form>

      <Button
        type="button"
        variant="secondary"
        className="w-full"
        disabled={pending}
        onClick={onGoogle}
      >
        {t("googleCta")}
      </Button>

      <p className="text-sm text-stone-600 dark:text-slate-300">
        {t("hasAccount")}{" "}
        <Link
          href="/login"
          className="font-medium text-teal-800 underline dark:text-teal-300"
        >
          {t("loginLink")}
        </Link>
      </p>
    </div>
  );
}
