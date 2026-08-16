"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { useAuth } from "@/components/providers/AuthProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { getIdToken } from "@/services/authService";
import {
  CLINICAL_CUSTOM_FIELD_TYPES,
  type ClinicalCustomFieldType,
  type ClinicalFieldLocale,
} from "@/types/domain";

type FieldRow = {
  id: string;
  fieldKey: string;
  labels: Partial<Record<ClinicalFieldLocale, string>>;
  label: string;
  type: ClinicalCustomFieldType;
  required: boolean;
  options: string[];
  sortOrder: number;
  missingLocales: ClinicalFieldLocale[];
  updatedById: string | null;
};

type AuditRow = {
  at: string;
  byUserId: string;
  action: string;
  fieldId: string;
  detail: string | null;
};

type PanelMode = "translate" | "edit" | null;

/**
 * Specialist-only custom clinical fields: type, order, required, audit.
 */
export function SpecialistClinicalFieldsEditor() {
  const t = useTranslations("ClinicalCustomFields");
  const locale = useLocale();
  const { user } = useAuth();
  const { success, error: toastError } = useToast();
  const [fields, setFields] = useState<FieldRow[]>([]);
  const [auditLog, setAuditLog] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [newLabel, setNewLabel] = useState("");
  const [newType, setNewType] = useState<ClinicalCustomFieldType>("textarea");
  const [newRequired, setNewRequired] = useState(false);
  const [newOptions, setNewOptions] = useState("");
  const [adding, setAdding] = useState(false);
  const [translateDrafts, setTranslateDrafts] = useState<
    Record<string, string>
  >({});
  const [editDrafts, setEditDrafts] = useState<
    Record<
      string,
      {
        es: string;
        en: string;
        type: ClinicalCustomFieldType;
        required: boolean;
        options: string;
      }
    >
  >({});
  const [openPanel, setOpenPanel] = useState<{
    id: string;
    mode: Exclude<PanelMode, null>;
  } | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [reordering, setReordering] = useState(false);

  const currentLocale: ClinicalFieldLocale = locale.startsWith("en")
    ? "en"
    : "es";

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        await reload(cancelled);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initial load
  }, [user, currentLocale]);

  async function reload(cancelled = false) {
    if (!user) return;
    const token = await getIdToken(user);
    const res = await fetch(
      `/api/specialists/me/clinical-fields?locale=${currentLocale}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const data = (await res.json()) as {
      fields?: FieldRow[];
      auditLog?: AuditRow[];
      error?: string;
    };
    if (!res.ok) throw new Error(data.error ?? t("loadError"));
    if (cancelled) return;
    setFields(data.fields ?? []);
    setAuditLog(data.auditLog ?? []);
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
          type: field.type,
          required: field.required,
          options: field.options.join("\n"),
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
      const options =
        newType === "select"
          ? newOptions
              .split("\n")
              .map((o) => o.trim())
              .filter(Boolean)
          : undefined;
      const res = await fetch("/api/specialists/me/clinical-fields", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          label: newLabel.trim(),
          locale: currentLocale,
          type: newType,
          required: newRequired,
          options,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? t("addError"));
      setNewLabel("");
      setNewOptions("");
      setNewRequired(false);
      setNewType("textarea");
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
      await reload();
    } catch (err) {
      toastError(err instanceof Error ? err.message : t("translateError"));
    } finally {
      setSavingId(null);
    }
  }

  async function saveEdit(field: FieldRow) {
    if (!user) return;
    const draft = editDrafts[field.id];
    if (!draft) return;
    if (!draft.es.trim() && !draft.en.trim()) return;
    setSavingId(field.id);
    try {
      const token = await getIdToken(user);
      const headers = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      };
      const labelsRes = await fetch(
        `/api/specialists/me/clinical-fields?locale=${currentLocale}`,
        {
          method: "PATCH",
          headers,
          body: JSON.stringify({
            fieldId: field.id,
            labels: { es: draft.es, en: draft.en },
          }),
        },
      );
      const labelsData = (await labelsRes.json()) as { error?: string };
      if (!labelsRes.ok) throw new Error(labelsData.error ?? t("editError"));

      const options =
        draft.type === "select"
          ? draft.options
              .split("\n")
              .map((o) => o.trim())
              .filter(Boolean)
          : [];
      const metaRes = await fetch(
        `/api/specialists/me/clinical-fields?locale=${currentLocale}`,
        {
          method: "PATCH",
          headers,
          body: JSON.stringify({
            fieldId: field.id,
            type: draft.type,
            required: draft.required,
            options,
          }),
        },
      );
      const metaData = (await metaRes.json()) as { error?: string };
      if (!metaRes.ok) throw new Error(metaData.error ?? t("editError"));

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

  async function moveField(index: number, direction: -1 | 1) {
    if (!user) return;
    const target = index + direction;
    if (target < 0 || target >= fields.length) return;
    const next = [...fields];
    const tmp = next[index]!;
    next[index] = next[target]!;
    next[target] = tmp;
    setReordering(true);
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
          body: JSON.stringify({ order: next.map((f) => f.id) }),
        },
      );
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? t("reorderError"));
      await reload();
    } catch (err) {
      toastError(err instanceof Error ? err.message : t("reorderError"));
    } finally {
      setReordering(false);
    }
  }

  function typeLabel(type: ClinicalCustomFieldType): string {
    return t(`types.${type}`);
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

      <div className="space-y-3 rounded-md border border-stone-100 bg-stone-50/60 p-3 dark:border-slate-700 dark:bg-slate-900/40">
        <Input
          label={t("newLabel")}
          name="newCustomField"
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          placeholder={t("newLabelPlaceholder")}
        />
        <div className="flex flex-wrap gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">{t("fieldType")}</span>
            <select
              className="h-10 rounded-md border border-stone-300 bg-white px-3 dark:border-slate-600 dark:bg-slate-900"
              value={newType}
              onChange={(e) =>
                setNewType(e.target.value as ClinicalCustomFieldType)
              }
            >
              {CLINICAL_CUSTOM_FIELD_TYPES.map((type) => (
                <option key={type} value={type}>
                  {typeLabel(type)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-end gap-2 pb-2 text-sm">
            <input
              type="checkbox"
              checked={newRequired}
              onChange={(e) => setNewRequired(e.target.checked)}
            />
            <span>{t("required")}</span>
          </label>
        </div>
        {newType === "select" ? (
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">{t("optionsLabel")}</span>
            <textarea
              rows={3}
              className="rounded-md border border-stone-300 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-900"
              value={newOptions}
              onChange={(e) => setNewOptions(e.target.value)}
              placeholder={t("optionsPlaceholder")}
            />
          </label>
        ) : null}
        <Button
          type="button"
          disabled={
            adding ||
            !newLabel.trim() ||
            (newType === "select" &&
              newOptions.split("\n").filter((o) => o.trim()).length < 2)
          }
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
          {fields.map((field, index) => {
            const missing = field.missingLocales;
            const translateLocale = missing[0] ?? null;
            const isTranslate =
              openPanel?.id === field.id && openPanel.mode === "translate";
            const isEdit =
              openPanel?.id === field.id && openPanel.mode === "edit";
            const editDraft = editDrafts[field.id];
            return (
              <li key={field.id} className="space-y-2 py-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-stone-900 dark:text-slate-50">
                      {field.label}
                      {field.required ? (
                        <span className="ml-1 text-red-600" aria-hidden>
                          *
                        </span>
                      ) : null}
                    </p>
                    <p className="text-xs text-stone-500 dark:text-slate-400">
                      {typeLabel(field.type)} · {field.fieldKey}
                      {field.updatedById
                        ? ` · ${t("lastEditor", { id: field.updatedById.slice(0, 8) })}`
                        : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-stone-300 text-sm disabled:opacity-40 dark:border-slate-600"
                      title={t("moveUp")}
                      aria-label={t("moveUp")}
                      disabled={reordering || index === 0}
                      onClick={() => void moveField(index, -1)}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-stone-300 text-sm disabled:opacity-40 dark:border-slate-600"
                      title={t("moveDown")}
                      aria-label={t("moveDown")}
                      disabled={reordering || index === fields.length - 1}
                      onClick={() => void moveField(index, 1)}
                    >
                      ↓
                    </button>
                    {missing.length > 0 ? (
                      <button
                        type="button"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-amber-300 bg-amber-50 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100"
                        title={t("missingHint", {
                          locales: missing.map((l) => l.toUpperCase()).join(", "),
                        })}
                        aria-label={t("missingHint", {
                          locales: missing.map((l) => l.toUpperCase()).join(", "),
                        })}
                        onClick={() => togglePanel(field.id, "translate")}
                      >
                        ⓘ
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-stone-300 text-sm dark:border-slate-600"
                      title={t("editCta")}
                      aria-label={t("editCta")}
                      onClick={() => togglePanel(field.id, "edit", field)}
                    >
                      ✎
                    </button>
                    <button
                      type="button"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-red-300 text-sm text-red-700 dark:border-red-800 dark:text-red-300"
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

                {isEdit && editDraft ? (
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
                    <label className="flex flex-col gap-1 text-sm">
                      <span className="font-medium">{t("fieldType")}</span>
                      <select
                        className="h-10 rounded-md border border-stone-300 bg-white px-3 dark:border-slate-600 dark:bg-slate-900"
                        value={editDraft.type}
                        onChange={(e) =>
                          setEditDrafts((prev) => ({
                            ...prev,
                            [field.id]: {
                              ...editDraft,
                              type: e.target.value as ClinicalCustomFieldType,
                            },
                          }))
                        }
                      >
                        {CLINICAL_CUSTOM_FIELD_TYPES.map((type) => (
                          <option key={type} value={type}>
                            {typeLabel(type)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={editDraft.required}
                        onChange={(e) =>
                          setEditDrafts((prev) => ({
                            ...prev,
                            [field.id]: {
                              ...editDraft,
                              required: e.target.checked,
                            },
                          }))
                        }
                      />
                      <span>{t("required")}</span>
                    </label>
                    {editDraft.type === "select" ? (
                      <label className="flex flex-col gap-1 text-sm">
                        <span className="font-medium">{t("optionsLabel")}</span>
                        <textarea
                          rows={3}
                          className="rounded-md border border-stone-300 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-900"
                          value={editDraft.options}
                          onChange={(e) =>
                            setEditDrafts((prev) => ({
                              ...prev,
                              [field.id]: {
                                ...editDraft,
                                options: e.target.value,
                              },
                            }))
                          }
                          placeholder={t("optionsPlaceholder")}
                        />
                      </label>
                    ) : null}
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

      {auditLog.length > 0 ? (
        <div className="space-y-2 border-t border-stone-200 pt-3 dark:border-slate-700">
          <h3 className="text-sm font-medium text-stone-800 dark:text-slate-100">
            {t("auditTitle")}
          </h3>
          <ul className="max-h-40 space-y-1 overflow-y-auto text-xs text-stone-600 dark:text-slate-400">
            {auditLog.slice(0, 12).map((entry, i) => (
              <li key={`${entry.at}-${entry.fieldId}-${i}`}>
                {new Date(entry.at).toLocaleString(locale)} · {entry.action} ·{" "}
                {entry.fieldId === "*" ? t("auditReorder") : entry.fieldId.slice(0, 8)}{" "}
                · {entry.byUserId.slice(0, 8)}
                {entry.detail ? ` · ${entry.detail}` : ""}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
