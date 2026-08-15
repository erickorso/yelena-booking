"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { useAuth } from "@/components/providers/AuthProvider";
import { Link, useRouter } from "@/i18n/navigation";

function dashboardPath(role: string | null): string {
  if (role === "admin") return "/dashboard/admin";
  if (role === "especialista") return "/dashboard/specialist";
  if (role === "paciente") return "/dashboard/patient";
  return "/register";
}

export function LoginForm() {
  const t = useTranslations("Auth");
  const router = useRouter();
  const { loginWithEmail, loginWithGoogle } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const nextRole = await loginWithEmail({ email, password });
      router.push(dashboardPath(nextRole));
    } catch (err) {
      const message = err instanceof Error ? err.message : t("errors.generic");
      if (message === "EMAIL_NOT_VERIFIED") {
        router.push("/verify-email");
        return;
      }
      setError(message);
    } finally {
      setPending(false);
    }
  }

  async function onGoogle() {
    setPending(true);
    setError(null);
    try {
      const nextRole = await loginWithGoogle();
      router.push(dashboardPath(nextRole));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.generic"));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md space-y-6">
      <div>
        <h1 className="font-serif text-3xl text-teal-800 dark:text-teal-300">
          {t("loginTitle")}
        </h1>
        <p className="mt-2 text-sm text-stone-600 dark:text-slate-300">
          {t("loginSubtitle")}
        </p>
      </div>

      <form className="space-y-4" onSubmit={onSubmit} noValidate>
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
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error ? (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        ) : null}
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? t("loading") : t("loginCta")}
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
        {t("noAccount")}{" "}
        <Link
          href="/register"
          className="font-medium text-teal-800 underline dark:text-teal-300"
        >
          {t("registerLink")}
        </Link>
      </p>
    </div>
  );
}
