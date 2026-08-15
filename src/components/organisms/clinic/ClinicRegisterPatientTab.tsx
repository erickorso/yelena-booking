"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";

type ClinicRegisterPatientTabProps = {
  name: string;
  email: string;
  pending: boolean;
  tempPassword: string | null;
  onNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onSubmit: (event: React.FormEvent) => void;
};

export function ClinicRegisterPatientTab({
  name,
  email,
  pending,
  tempPassword,
  onNameChange,
  onEmailChange,
  onSubmit,
}: ClinicRegisterPatientTabProps) {
  const t = useTranslations("Clinic");

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4 rounded-md border border-stone-200 p-4 dark:border-slate-700"
    >
      <h2 className="font-serif text-xl text-teal-800 dark:text-teal-300">
        {t("registerTitle")}
      </h2>
      <p className="text-sm text-stone-600 dark:text-slate-300">
        {t("registerSubtitle")}
      </p>
      <Input
        label={t("displayName")}
        name="patientName"
        value={name}
        onChange={(e) => onNameChange(e.target.value)}
        required
      />
      <Input
        label={t("email")}
        name="patientEmail"
        type="email"
        value={email}
        onChange={(e) => onEmailChange(e.target.value)}
        required
      />
      {tempPassword ? (
        <p
          role="status"
          className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:bg-amber-950/40 dark:text-amber-100"
        >
          {t("tempPassword", { password: tempPassword })}
        </p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? t("registering") : t("registerCta")}
      </Button>
    </form>
  );
}
