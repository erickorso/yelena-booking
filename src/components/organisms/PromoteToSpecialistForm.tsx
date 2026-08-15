"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { useAuth } from "@/components/providers/AuthProvider";
import { getIdToken } from "@/services/authService";
import { useRouter } from "@/i18n/navigation";

/**
 * Patient requests elevation to specialist (pending approval).
 */
export function PromoteToSpecialistForm() {
  const t = useTranslations("Promote");
  const { user, refreshRole } = useAuth();
  const router = useRouter();
  const [specialty, setSpecialty] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!user) return;
    setPending(true);
    setError(null);
    try {
      const token = await getIdToken(user, true);
      const response = await fetch("/api/specialists/promote", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ specialty, licenseNumber }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? t("error"));
      }
      await getIdToken(user, true);
      await refreshRole();
      setDone(true);
      router.push("/dashboard/specialist");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("error"));
    } finally {
      setPending(false);
    }
  }

  if (done) {
    return (
      <p role="status" className="text-sm text-teal-800 dark:text-teal-300">
        {t("success")}
      </p>
    );
  }

  return (
    <form
      onSubmit={(e) => void onSubmit(e)}
      className="space-y-4 rounded-md border border-stone-200 p-4 dark:border-slate-700"
    >
      <div>
        <h2 className="font-serif text-xl text-teal-800 dark:text-teal-300">
          {t("title")}
        </h2>
        <p className="mt-1 text-sm text-stone-600 dark:text-slate-300">
          {t("subtitle")}
        </p>
      </div>
      <Input
        label={t("specialty")}
        name="specialty"
        value={specialty}
        onChange={(e) => setSpecialty(e.target.value)}
        required
      />
      <Input
        label={t("licenseNumber")}
        name="licenseNumber"
        value={licenseNumber}
        onChange={(e) => setLicenseNumber(e.target.value)}
        required
      />
      {error ? (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? t("submitting") : t("submit")}
      </Button>
    </form>
  );
}
