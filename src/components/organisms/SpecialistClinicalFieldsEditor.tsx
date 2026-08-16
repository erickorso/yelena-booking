"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { useAuth } from "@/components/providers/AuthProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { getIdToken } from "@/services/authService";
import type { ClinicalFieldLocale } from "@/types/domain";

type FieldRow = {
  id: string;
  fieldKey: string;
  labels: Partial<Record<ClinicalFieldLocale, string>>;
  label: string;
  missingLocales: ClinicalFieldLocale[];
};

/**
 * Specialist UI: define custom clinical-history questions + missing translations.
 */
export function SpecialistClinicalFieldsEditor() {
  const t = useTranslations("ClinicalCustomFields");
  const locale = useLocale();
  const { user } = useAuth();
  const { success, error: toastError } = useToast();
  const [fields, setFields] = useState<FieldRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [newLabel, setNewLabel] = useState("");
  const [adding, setAdding] = useState(false);
  const [translateDrafts, setTranslateDrafts] = useState<
    Record<string, string>
  >({});
  const [openTranslateId, setOpenTranslateId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const currentLocale: ClinicalFieldLocale = locale.startsWith("en")
    ? "en"
    : "es";

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const token = await getIdToken(user);
        const res = await fetch(
          `/api/specialists/me/clinical-fields?locale=${currentLocale}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        const data = (await res.json()) as {
          fields?: FieldRow[];
          error?: string;
        };
        if (cancelled) return;
        if (!res.ok) throw new Error(data.error ?? t("loadError"));
        setFields(data.fields ?? []);
      } catch (err) {
        if (!cancelled) {
          toastError(err instanceof Error ? err.message : t("loadError"));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, currentLocale, t, toastError]);

  async function reload() {
    if (!user) return;
    const token = await getIdToken(user);
    const res = await fetch(
      `/api/specialists/me/clinical-fields?locale=${currentLocale}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const data = (await res.json()) as {
      fields?: FieldRow[];
      error?: string;
    };
    if (!res.ok) throw new Error(data.error ?? t("loadError"));
    setFields(data.fields ?? []);
  }

  async function addField() {
    if (!user || !newLabel.trim()) return;
    setAdding(true);
    try {
      const token = await getIdToken(user);
      const res = await fetch("/api/specialists/me/clinical-fields", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ label: newLabel.trim(), locale: currentLocale }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? t("addError"));
      setNewLabel("");
      success(t("addSuccess"));
      await reload();
    } catch (err) {
      toastError(err instanceof Error ? err.message : t("addError"));
    } finally {
      setAdding(false);
    }
  }

  async function saveTranslation(field: FieldRow, localeToSet: ClinicalFieldLocale) {
    if (!user) return;
    const label = (translateDrafts[field.id] ?? "").trim();
    if (!label) return;
    setSavingId(field.id);
    try {
      const token = await getIdToken(user);
      const res = await fetch("/api/specialists/me/clinical-fields", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fieldId: field.id,
          locale: localeToSet,
          label,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? t("translateError"));
      success(t("translateSuccess"));
      setOpenTranslateId(null);
      setTranslateDrafts((prev) => {
        const next = { ...prev };
        delete next[field.id];
        return next;
      });
      await reload();
    } catch (err) {
      toastError(err instanceof Error ? err.message : t("translateError"));
    } finally {
      setSavingId(null);
    }
  }

  return (
    <section className="space-y-4 rounded-md border border-stone-200 p-4 dark:border-slate-700">
      <div>
        <h2 className="font-serif text-xl text-teal-800 dark:text-teal-300">
          {t("title")}
        </h2>
        <p className="mt-1 text-sm text-stone-600 dark:text-slate-300">
          {t("subtitle")}
        </p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="flex-1">
          <Input
            label={t("newLabel")}
            name="newCustomField"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder={t("newLabelPlaceholder")}
          />
        </div>
        <Button
          type="button"
          disabled={adding || !newLabel.trim()}
          onClick={() => void addField()}
        >
          {adding ? t("adding") : t("addCta")}
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-stone-500">{t("loading")}</p>
      ) : fields.length === 0 ? (
        <p className="text-sm text-stone-600 dark:text-slate-300">
          {t("empty")}
        </p>
      ) : (
        <ul className="divide-y divide-stone-200 dark:divide-slate-700">
          {fields.map((field) => {
            const missing = field.missingLocales;
            const translateLocale = missing[0] ?? null;
            const isOpen = openTranslateId === field.id;
            return (
              <li key={field.id} className="space-y-2 py-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-stone-900 dark:text-slate-50">
                      {field.label}
                    </p>
                    <p className="text-xs text-stone-500 dark:text-slate-400">
                      {field.fieldKey}
                      {field.labels.es ? ` · ES: ${field.labels.es}` : ""}
                      {field.labels.en ? ` · EN: ${field.labels.en}` : ""}
                    </p>
                  </div>
                  {missing.length > 0 ? (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100"
                      title={t("missingHint", {
                        locales: missing.map((l) => l.toUpperCase()).join(", "),
                      })}
                      aria-label={t("missingHint", {
                        locales: missing.map((l) => l.toUpperCase()).join(", "),
                      })}
                      onClick={() =>
                        setOpenTranslateId(isOpen ? null : field.id)
                      }
                    >
                      <span aria-hidden>ⓘ</span>
                      {t("missingBadge")}
                    </button>
                  ) : null}
                </div>
                {isOpen && translateLocale ? (
                  <div className="flex flex-col gap-2 rounded-md border border-stone-200 p-3 dark:border-slate-600 sm:flex-row sm:items-end">
                    <div className="flex-1">
                      <Input
                        label={t("translateLabel", {
                          locale: translateLocale.toUpperCase(),
                        })}
                        name={`translate-${field.id}`}
                        value={translateDrafts[field.id] ?? ""}
                        onChange={(e) =>
                          setTranslateDrafts((prev) => ({
                            ...prev,
                            [field.id]: e.target.value,
                          }))
                        }
                        placeholder={t("translatePlaceholder")}
                      />
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      disabled={
                        savingId === field.id ||
                        !(translateDrafts[field.id] ?? "").trim()
                      }
                      onClick={() =>
                        void saveTranslation(field, translateLocale)
                      }
                    >
                      {savingId === field.id
                        ? t("savingTranslation")
                        : t("saveTranslation")}
                    </Button>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
