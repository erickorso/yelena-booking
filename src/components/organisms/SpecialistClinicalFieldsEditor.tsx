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

type PanelMode = "translate" | "edit" | null;

/**
 * Specialist UI: define custom clinical-history questions + edit/delete.
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
  const [editDrafts, setEditDrafts] = useState<
    Record<string, { es: string; en: string }>
  >({});
  const [openPanel, setOpenPanel] = useState<{
    id: string;
    mode: Exclude<PanelMode, null>;
  } | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

  function togglePanel(id: string, mode: Exclude<PanelMode, null>, field?: FieldRow) {
    if (openPanel?.id === id && openPanel.mode === mode) {
      setOpenPanel(null);
      return;
    }
    if (mode === "edit" && field) {
      setEditDrafts((prev) => ({
        ...prev,
        [id]: {
          es: field.labels.es ?? "",
          en: field.labels.en ?? "",
        },
      }));
    }
    setOpenPanel({ id, mode });
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

  async function saveTranslation(
    field: FieldRow,
    localeToSet: ClinicalFieldLocale,
  ) {
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
      setOpenPanel(null);
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

  async function saveEdit(field: FieldRow) {
    if (!user) return;
    const draft = editDrafts[field.id] ?? { es: "", en: "" };
    if (!draft.es.trim() && !draft.en.trim()) return;
    setSavingId(field.id);
    try {
      const token = await getIdToken(user);
      const res = await fetch(
        `/api/specialists/me/clinical-fields?locale=${currentLocale}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fieldId: field.id,
            labels: { es: draft.es, en: draft.en },
          }),
        },
      );
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? t("editError"));
      success(t("editSuccess"));
      setOpenPanel(null);
      await reload();
    } catch (err) {
      toastError(err instanceof Error ? err.message : t("editError"));
    } finally {
      setSavingId(null);
    }
  }

  async function deleteField(field: FieldRow) {
    if (!user) return;
    if (!window.confirm(t("deleteConfirm", { label: field.label }))) return;
    setDeletingId(field.id);
    try {
      const token = await getIdToken(user);
      const res = await fetch(
        `/api/specialists/me/clinical-fields?fieldId=${encodeURIComponent(field.id)}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? t("deleteError"));
      success(t("deleteSuccess"));
      if (openPanel?.id === field.id) setOpenPanel(null);
      await reload();
    } catch (err) {
      toastError(err instanceof Error ? err.message : t("deleteError"));
    } finally {
      setDeletingId(null);
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
            const isTranslate =
              openPanel?.id === field.id && openPanel.mode === "translate";
            const isEdit =
              openPanel?.id === field.id && openPanel.mode === "edit";
            const editDraft = editDrafts[field.id] ?? { es: "", en: "" };
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
                  <div className="flex flex-wrap items-center gap-1.5">
                    {missing.length > 0 ? (
                      <button
                        type="button"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-amber-300 bg-amber-50 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100"
                        title={t("missingHint", {
                          locales: missing
                            .map((l) => l.toUpperCase())
                            .join(", "),
                        })}
                        aria-label={t("missingHint", {
                          locales: missing
                            .map((l) => l.toUpperCase())
                            .join(", "),
                        })}
                        onClick={() => togglePanel(field.id, "translate")}
                      >
                        ⓘ
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-stone-300 text-sm text-stone-700 hover:bg-stone-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
                      title={t("editCta")}
                      aria-label={t("editCta")}
                      onClick={() => togglePanel(field.id, "edit", field)}
                    >
                      ✎
                    </button>
                    <button
                      type="button"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-red-300 text-sm text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/40"
                      title={t("deleteCta")}
                      aria-label={t("deleteCta")}
                      disabled={deletingId === field.id}
                      onClick={() => void deleteField(field)}
                    >
                      {deletingId === field.id ? "…" : "🗑"}
                    </button>
                  </div>
                </div>

                {isTranslate && translateLocale ? (
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

                {isEdit ? (
                  <div className="space-y-3 rounded-md border border-stone-200 p-3 dark:border-slate-600">
                    <Input
                      label={t("editLabelEs")}
                      name={`edit-es-${field.id}`}
                      value={editDraft.es}
                      onChange={(e) =>
                        setEditDrafts((prev) => ({
                          ...prev,
                          [field.id]: { ...editDraft, es: e.target.value },
                        }))
                      }
                    />
                    <Input
                      label={t("editLabelEn")}
                      name={`edit-en-${field.id}`}
                      value={editDraft.en}
                      onChange={(e) =>
                        setEditDrafts((prev) => ({
                          ...prev,
                          [field.id]: { ...editDraft, en: e.target.value },
                        }))
                      }
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        disabled={
                          savingId === field.id ||
                          (!editDraft.es.trim() && !editDraft.en.trim())
                        }
                        onClick={() => void saveEdit(field)}
                      >
                        {savingId === field.id
                          ? t("savingEdit")
                          : t("saveEdit")}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => setOpenPanel(null)}
                      >
                        {t("cancelEdit")}
                      </Button>
                    </div>
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
