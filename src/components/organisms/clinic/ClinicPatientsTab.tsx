"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import type { ClinicPatientOption } from "@/components/organisms/clinic/clinicTypes";
import {
  APP_TIMEZONES,
  DEFAULT_PATIENT_TIMEZONE,
  resolvePatientTimezone,
} from "@/lib/timezones";
import { matchesPatientQuery } from "@/lib/patients/patientSearch";

type ClinicPatientsTabProps = {
  patients: ClinicPatientOption[];
  name: string;
  email: string;
  phone: string;
  timezone: string;
  pending: boolean;
  tempPassword: string | null;
  onNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
  onTimezoneChange: (value: string) => void;
  onSubmit: (event: React.FormEvent) => void;
  onOpenChart: (patientId: string) => void;
  onPatientTimezoneSave: (patientId: string, timezone: string) => Promise<void>;
};

/**
 * Pacientes: alta (con zona horaria) + listado con TZ editable + ficha.
 */
export function ClinicPatientsTab({
  patients,
  name,
  email,
  phone,
  timezone,
  pending,
  tempPassword,
  onNameChange,
  onEmailChange,
  onPhoneChange,
  onTimezoneChange,
  onSubmit,
  onOpenChart,
  onPatientTimezoneSave,
}: ClinicPatientsTabProps) {
  const t = useTranslations("Clinic");
  const locale = useLocale();
  const [query, setQuery] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const deferredQuery = useDeferredValue(query);

  const filtered = useMemo(() => {
    const q = deferredQuery.trim();
    if (!q) return patients;
    return patients.filter((p) => matchesPatientQuery(q, p));
  }, [patients, deferredQuery]);

  function zoneLabel(value: string): string {
    const row = APP_TIMEZONES.find((z) => z.value === value);
    if (!row) return value;
    return locale.startsWith("en") ? row.labelEn : row.labelEs;
  }

  async function saveTimezone(patientId: string, next: string) {
    setSavingId(patientId);
    try {
      await onPatientTimezoneSave(patientId, next);
    } finally {
      setSavingId(null);
    }
  }

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
          autoComplete="off"
          aria-controls="clinic-patients-results"
        />
        <p id="clinic-patients-results" className="sr-only" aria-live="polite">
          {filtered.length} {t("patientsListTitle")}
        </p>
        {filtered.length === 0 ? (
          <p className="text-sm text-stone-600 dark:text-slate-300">
            {t("patientsEmpty")}
          </p>
        ) : (
          <ul className="divide-y divide-stone-200 dark:divide-slate-700">
            {filtered.map((p) => {
              const tz = resolvePatientTimezone(p.timezone);
              return (
                <li
                  key={p.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3"
                >
                  <div className="min-w-0 flex-1 space-y-2">
                    <div>
                      <p className="font-medium text-stone-900 dark:text-slate-50">
                        {p.displayName}
                      </p>
                      <p className="text-sm text-stone-500 dark:text-slate-400">
                        {p.email}
                        {p.patientNumber ? ` · ${p.patientNumber}` : ""}
                      </p>
                    </div>
                    <label className="flex max-w-md flex-col gap-1 text-sm">
                      <span className="font-medium text-stone-800 dark:text-slate-100">
                        {t("patientTimezone")}
                      </span>
                      <select
                        value={tz}
                        disabled={savingId === p.id}
                        onChange={(e) => void saveTimezone(p.id, e.target.value)}
                        className="h-10 rounded-md border border-stone-300 bg-white px-3 dark:border-slate-600 dark:bg-slate-900"
                      >
                        {APP_TIMEZONES.map((z) => (
                          <option key={z.value} value={z.value}>
                            {zoneLabel(z.value)}
                          </option>
                        ))}
                      </select>
                    </label>
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
              );
            })}
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
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-stone-800 dark:text-slate-100">
            {t("patientTimezone")}
          </span>
          <select
            value={timezone || DEFAULT_PATIENT_TIMEZONE}
            onChange={(e) => onTimezoneChange(e.target.value)}
            className="h-10 rounded-md border border-stone-300 bg-white px-3 dark:border-slate-600 dark:bg-slate-900"
          >
            {APP_TIMEZONES.map((z) => (
              <option key={z.value} value={z.value}>
                {zoneLabel(z.value)}
              </option>
            ))}
          </select>
          <span className="text-xs text-stone-500 dark:text-slate-400">
            {t("patientTimezoneHint")}
          </span>
        </label>
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
