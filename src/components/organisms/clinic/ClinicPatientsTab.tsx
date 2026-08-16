"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import type { ClinicPatientOption } from "@/components/organisms/clinic/clinicTypes";

type ClinicPatientsTabProps = {
  patients: ClinicPatientOption[];
  name: string;
  email: string;
  phone: string;
  pending: boolean;
  tempPassword: string | null;
  onNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
  onSubmit: (event: React.FormEvent) => void;
  /** Open historia + documentos for this patient */
  onOpenChart: (patientId: string) => void;
};

/**
 * Pacientes: alta + listado para abrir historia clínica y documentos.
 */
export function ClinicPatientsTab({
  patients,
  name,
  email,
  phone,
  pending,
  tempPassword,
  onNameChange,
  onEmailChange,
  onPhoneChange,
  onSubmit,
  onOpenChart,
}: ClinicPatientsTabProps) {
  const t = useTranslations("Clinic");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return patients;
    return patients.filter(
      (p) =>
        p.displayName.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q),
    );
  }, [patients, query]);

  return (
    <div className="space-y-8">
      <section className="space-y-3 rounded-md border border-stone-200 p-4 dark:border-slate-700">
        <div>
          <h2 className="font-serif text-xl text-teal-800 dark:text-teal-300">
            {t("patientsListTitle")}
          </h2>
          <p className="mt-1 text-sm text-stone-600 dark:text-slate-300">
            {t("patientsListSubtitle")}
          </p>
        </div>
        <Input
          label={t("patientsSearch")}
          name="patientSearch"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("patientSearch")}
        />
        {filtered.length === 0 ? (
          <p className="text-sm text-stone-600 dark:text-slate-300">
            {t("patientsEmpty")}
          </p>
        ) : (
          <ul className="divide-y divide-stone-200 dark:divide-slate-700">
            {filtered.map((p) => (
              <li
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3"
              >
                <div>
                  <p className="font-medium text-stone-900 dark:text-slate-50">
                    {p.displayName}
                  </p>
                  <p className="text-sm text-stone-500 dark:text-slate-400">
                    {p.email}
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => onOpenChart(p.id)}
                >
                  {t("patientsOpenChart")}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

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
        <Input
          label={t("phone")}
          name="patientPhone"
          type="tel"
          value={phone}
          onChange={(e) => onPhoneChange(e.target.value)}
          required
          placeholder={t("phonePlaceholder")}
        />
        <p className="text-xs text-stone-500 dark:text-slate-400">
          {t("registerPhoneHint")}
        </p>
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
    </div>
  );
}
