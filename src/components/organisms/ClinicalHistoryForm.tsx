"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { FormSkeleton } from "@/components/atoms/Skeleton";
import { CollapsibleSection } from "@/components/molecules/CollapsibleSection";
import { useAuth } from "@/components/providers/AuthProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { getIdToken } from "@/services/authService";
import {
  PATIENT_SEX_OPTIONS,
  type PatientSex,
} from "@/types/domain";

type HistoryForm = {
  birthDate: string;
  sex: PatientSex | "";
  phone: string;
  address: string;
  bloodType: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  allergies: string;
  chronicConditions: string;
  currentMedications: string;
  surgicalHistory: string;
  familyHistory: string;
  habits: string;
  generalNotes: string;
};

const EMPTY: HistoryForm = {
  birthDate: "",
  sex: "",
  phone: "",
  address: "",
  bloodType: "",
  emergencyContactName: "",
  emergencyContactPhone: "",
  allergies: "",
  chronicConditions: "",
  currentMedications: "",
  surgicalHistory: "",
  familyHistory: "",
  habits: "",
  generalNotes: "",
};

type ClinicalHistoryFormProps = {
  /** Defaults to current user. */
  patientId?: string;
  /** Specialist editing another patient's chart. */
  readOnly?: boolean;
  onSaved?: (incomplete: boolean) => void;
  /** Outer panel starts collapsed. */
  defaultOpen?: boolean;
};

/**
 * Standard clinical history form (demographics + antecedents), collapsible.
 */
export function ClinicalHistoryForm({
  patientId: patientIdProp,
  readOnly = false,
  onSaved,
  defaultOpen = true,
}: ClinicalHistoryFormProps) {
  const t = useTranslations("ClinicalHistory");
  const { user } = useAuth();
  const { success, error: toastError } = useToast();
  const patientId = patientIdProp ?? user?.uid ?? "";
  const [form, setForm] = useState<HistoryForm>(EMPTY);
  const [displayName, setDisplayName] = useState("");
  const [patientNumber, setPatientNumber] = useState("");
  const [canEditName, setCanEditName] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !patientId) return;
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const token = await getIdToken(user);
        const res = await fetch(
          `/api/patients/${patientId}/clinical-history`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        const data = (await res.json()) as {
          history?: Record<string, unknown>;
          displayName?: string | null;
          patientNumber?: string | null;
          error?: string;
        };
        if (cancelled) return;
        if (!res.ok) {
          toastError(data.error ?? t("loadError"));
          return;
        }
        const h = data.history ?? {};
        setDisplayName(
          typeof data.displayName === "string" ? data.displayName : "",
        );
        setPatientNumber(
          typeof data.patientNumber === "string" ? data.patientNumber : "",
        );
        setCanEditName(!readOnly);
        setForm({
          birthDate: typeof h.birthDate === "string" ? h.birthDate : "",
          sex: typeof h.sex === "string" ? (h.sex as PatientSex) : "",
          phone: typeof h.phone === "string" ? h.phone : "",
          address: typeof h.address === "string" ? h.address : "",
          bloodType: typeof h.bloodType === "string" ? h.bloodType : "",
          emergencyContactName:
            typeof h.emergencyContactName === "string"
              ? h.emergencyContactName
              : "",
          emergencyContactPhone:
            typeof h.emergencyContactPhone === "string"
              ? h.emergencyContactPhone
              : "",
          allergies: typeof h.allergies === "string" ? h.allergies : "",
          chronicConditions:
            typeof h.chronicConditions === "string" ? h.chronicConditions : "",
          currentMedications:
            typeof h.currentMedications === "string"
              ? h.currentMedications
              : "",
          surgicalHistory:
            typeof h.surgicalHistory === "string" ? h.surgicalHistory : "",
          familyHistory:
            typeof h.familyHistory === "string" ? h.familyHistory : "",
          habits: typeof h.habits === "string" ? h.habits : "",
          generalNotes:
            typeof h.generalNotes === "string" ? h.generalNotes : "",
        });
        setUpdatedAt(
          typeof h.updatedAt === "string" ? h.updatedAt : null,
        );
      } catch {
        if (!cancelled) toastError(t("loadError"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, patientId, toastError, t, readOnly]);

  function patch<K extends keyof HistoryForm>(key: K, value: HistoryForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!user || !patientId || readOnly) return;
    setSaving(true);
    try {
      const token = await getIdToken(user);
      const res = await fetch(`/api/patients/${patientId}/clinical-history`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          sex: form.sex || null,
          birthDate: form.birthDate || null,
          ...(canEditName ? { displayName: displayName.trim() } : {}),
        }),
      });
      const data = (await res.json()) as {
        history?: { updatedAt?: string };
        incomplete?: boolean;
        displayName?: string | null;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? t("saveError"));
      setUpdatedAt(data.history?.updatedAt ?? new Date().toISOString());
      if (typeof data.displayName === "string") {
        setDisplayName(data.displayName);
      }
      onSaved?.(Boolean(data.incomplete));
      success(t("saveSuccess"));
      if (canEditName && typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("yelena:profile-updated", {
            detail: { displayName: data.displayName ?? displayName },
          }),
        );
      }
    } catch (err) {
      toastError(err instanceof Error ? err.message : t("saveError"));
    } finally {
      setSaving(false);
    }
  }

  const meta = updatedAt
    ? t("lastUpdated", { date: new Date(updatedAt).toLocaleString() })
    : null;

  return (
    <CollapsibleSection
      title={t("title")}
      subtitle={t("subtitle")}
      meta={meta}
      defaultOpen={defaultOpen}
      loading={loading}
      skeleton={<FormSkeleton />}
    >
      <form
        onSubmit={(e) => void onSubmit(e)}
        className="space-y-4"
        noValidate
      >
        <CollapsibleSection
          nested
          title={t("sectionDemographics")}
          defaultOpen
        >
          <fieldset className="space-y-3" disabled={readOnly}>
            {patientNumber ? (
              <div className="flex flex-col gap-1.5 text-sm text-stone-800 dark:text-slate-100">
                <span className="font-medium">{t("patientNumber")}</span>
                <p
                  className="flex h-10 items-center rounded-md border border-dashed border-stone-300 bg-stone-50 px-3 font-mono text-sm tracking-wide text-stone-800 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
                  aria-readonly="true"
                >
                  {patientNumber}
                </p>
                <span className="text-xs text-stone-500 dark:text-slate-400">
                  {t("patientNumberHint")}
                </span>
              </div>
            ) : null}
            <Input
              label={t("displayName")}
              name="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required={canEditName}
              disabled={readOnly || !canEditName}
              autoComplete="name"
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                label={t("birthDate")}
                name="birthDate"
                type="date"
                value={form.birthDate}
                onChange={(e) => patch("birthDate", e.target.value)}
              />
              <label className="flex flex-col gap-1.5 text-sm text-stone-800 dark:text-slate-100">
                <span className="font-medium">{t("sex")}</span>
                <select
                  name="sex"
                  value={form.sex}
                  onChange={(e) =>
                    patch("sex", e.target.value as PatientSex | "")
                  }
                  className="h-10 rounded-md border border-stone-300 bg-white px-3 dark:border-slate-600 dark:bg-slate-900"
                >
                  <option value="">{t("sexUnspecified")}</option>
                  {PATIENT_SEX_OPTIONS.filter((s) => s !== "unspecified").map(
                    (s) => (
                      <option key={s} value={s}>
                        {t(`sex_${s}`)}
                      </option>
                    ),
                  )}
                </select>
              </label>
              <Input
                label={t("phone")}
                name="phone"
                type="tel"
                value={form.phone}
                onChange={(e) => patch("phone", e.target.value)}
              />
              <Input
                label={t("bloodType")}
                name="bloodType"
                value={form.bloodType}
                onChange={(e) => patch("bloodType", e.target.value)}
                placeholder={t("bloodTypePlaceholder")}
              />
            </div>
            <Input
              label={t("address")}
              name="address"
              value={form.address}
              onChange={(e) => patch("address", e.target.value)}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                label={t("emergencyName")}
                name="emergencyContactName"
                value={form.emergencyContactName}
                onChange={(e) => patch("emergencyContactName", e.target.value)}
              />
              <Input
                label={t("emergencyPhone")}
                name="emergencyContactPhone"
                type="tel"
                value={form.emergencyContactPhone}
                onChange={(e) => patch("emergencyContactPhone", e.target.value)}
              />
            </div>
          </fieldset>
        </CollapsibleSection>

        <CollapsibleSection
          nested
          title={t("sectionClinical")}
          defaultOpen={false}
        >
          <fieldset className="space-y-3" disabled={readOnly}>
            {(
              [
                ["allergies", "allergies"],
                ["chronicConditions", "chronicConditions"],
                ["currentMedications", "currentMedications"],
                ["surgicalHistory", "surgicalHistory"],
                ["familyHistory", "familyHistory"],
                ["habits", "habits"],
                ["generalNotes", "generalNotes"],
              ] as const
            ).map(([key, labelKey]) => (
              <label
                key={key}
                className="flex flex-col gap-1.5 text-sm text-stone-800 dark:text-slate-100"
              >
                <span className="font-medium">{t(labelKey)}</span>
                <textarea
                  name={key}
                  rows={3}
                  value={form[key]}
                  onChange={(e) => patch(key, e.target.value)}
                  placeholder={t(`${labelKey}Hint`)}
                  className="rounded-md border border-stone-300 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-900"
                />
              </label>
            ))}
          </fieldset>
        </CollapsibleSection>

        {!readOnly ? (
          <Button type="submit" disabled={saving}>
            {saving ? t("saving") : t("save")}
          </Button>
        ) : null}
      </form>
    </CollapsibleSection>
  );
}
