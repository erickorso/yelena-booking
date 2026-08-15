"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { SearchableSelect } from "@/components/molecules/SearchableSelect";
import { useAuth } from "@/components/providers/AuthProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { getIdToken } from "@/services/authService";
import type { MedicalFileScope } from "@/types/domain";

type FileRow = {
  id: string;
  scope: MedicalFileScope | string;
  patientId: string | null;
  appointmentId: string | null;
  label: string | null;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  url: string;
  createdAt: string;
};

type PatientOption = {
  id: string;
  displayName: string;
  email: string;
};

type MedicalFilesPanelProps = {
  /** patient chart vs specialist personal library */
  mode: "patient_chart" | "specialist_library";
  /** Fixed patient (specialist clinic selection). Overrides self when set. */
  patientId?: string;
  /** When mode=patient_chart and role is specialist, allow picking patient */
  allowPickPatient?: boolean;
};

/**
 * Append-only medical documents (PDF / images / Word). No delete.
 */
export function MedicalFilesPanel({
  mode,
  patientId: fixedPatientId,
  allowPickPatient = false,
}: MedicalFilesPanelProps) {
  const t = useTranslations("MedicalFiles");
  const { user, role } = useAuth();
  const { success, error: toastError } = useToast();

  const [files, setFiles] = useState<FileRow[]>([]);
  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [pickedPatientId, setPickedPatientId] = useState("");
  const [scope, setScope] = useState<MedicalFileScope>(
    mode === "specialist_library" ? "specialist_profile" : "patient_general",
  );
  const [label, setLabel] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const targetPatientId =
    mode === "specialist_library"
      ? ""
      : (fixedPatientId ||
        (allowPickPatient ? pickedPatientId : (user?.uid ?? "")));

  useEffect(() => {
    if (!user) return;
    if (mode === "patient_chart" && !targetPatientId) {
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const token = await getIdToken(user);
        if (cancelled) return;
        const qs =
          mode === "specialist_library"
            ? "scope=specialist_profile"
            : `patientId=${encodeURIComponent(targetPatientId)}`;
        const res = await fetch(`/api/files?${qs}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = (await res.json()) as { files?: FileRow[]; error?: string };
        if (cancelled) return;
        if (!res.ok) throw new Error(data.error ?? t("loadError"));
        setFiles(data.files ?? []);
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
  }, [user, mode, targetPatientId, t, toastError, reloadKey]);

  useEffect(() => {
    if (
      !allowPickPatient ||
      !user ||
      (role !== "especialista" && role !== "admin")
    ) {
      return;
    }
    let cancelled = false;
    void (async () => {
      const token = await getIdToken(user);
      const res = await fetch("/api/specialists/patients", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = (await res.json()) as { patients?: PatientOption[] };
      if (!cancelled && res.ok) {
        setPatients(data.patients ?? []);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [allowPickPatient, user, role]);

  async function onUpload(event: React.FormEvent) {
    event.preventDefault();
    if (!user || !file) return;
    if (mode === "patient_chart" && !targetPatientId) {
      toastError(t("pickPatient"));
      return;
    }
    setUploading(true);
    try {
      const token = await getIdToken(user);
      const body = new FormData();
      body.set("file", file);
      body.set("scope", scope);
      if (label.trim()) body.set("label", label.trim());
      if (scope !== "specialist_profile") {
        body.set("patientId", targetPatientId);
      }
      const res = await fetch("/api/files", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body,
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? t("uploadError"));
      success(t("uploadSuccess"));
      setFile(null);
      setLabel("");
      setLoading(true);
      setReloadKey((k) => k + 1);
    } catch (err) {
      toastError(err instanceof Error ? err.message : t("uploadError"));
    } finally {
      setUploading(false);
    }
  }

  function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function scopeLabel(s: string): string {
    if (s === "patient_general") return t("scopeGeneral");
    if (s === "appointment") return t("scopeLastVisit");
    if (s === "specialist_profile") return t("scopeLibrary");
    return s;
  }

  return (
    <section className="space-y-4 rounded-md border border-stone-200 p-4 dark:border-slate-700">
      <div>
        <h2 className="font-serif text-xl text-teal-800 dark:text-teal-300">
          {mode === "specialist_library" ? t("libraryTitle") : t("chartTitle")}
        </h2>
        <p className="mt-1 text-sm text-stone-600 dark:text-slate-300">
          {t("subtitle")}
        </p>
      </div>

      <form onSubmit={(e) => void onUpload(e)} className="space-y-3">
        {allowPickPatient ? (
          <SearchableSelect
            label={t("patient")}
            placeholder={t("patientPlaceholder")}
            searchPlaceholder={t("patientSearch")}
            emptyLabel={t("patientEmpty")}
            value={pickedPatientId}
            onChange={setPickedPatientId}
            options={patients.map((p) => ({
              id: p.id,
              label: `${p.displayName} · ${p.email}`,
              searchText: `${p.displayName} ${p.email}`,
            }))}
          />
        ) : null}

        {mode === "patient_chart" ? (
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">{t("attachTo")}</legend>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant={scope === "patient_general" ? "primary" : "secondary"}
                onClick={() => setScope("patient_general")}
              >
                {t("scopeGeneral")}
              </Button>
              <Button
                type="button"
                size="sm"
                variant={scope === "appointment" ? "primary" : "secondary"}
                onClick={() => setScope("appointment")}
              >
                {t("scopeLastVisit")}
              </Button>
            </div>
          </fieldset>
        ) : null}

        <Input
          label={t("label")}
          name="fileLabel"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder={t("labelPlaceholder")}
        />

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">{t("file")}</span>
          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,application/pdf,image/*,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="text-sm file:mr-3 file:rounded-md file:border-0 file:bg-teal-700 file:px-3 file:py-2 file:text-white"
            required
          />
          <span className="text-xs text-stone-500 dark:text-slate-400">
            {t("formats")}
          </span>
        </label>

        <Button type="submit" disabled={uploading || !file}>
          {uploading ? t("uploading") : t("uploadCta")}
        </Button>
      </form>

      <div className="space-y-2">
        <h3 className="text-sm font-medium text-stone-800 dark:text-slate-100">
          {t("listTitle")}
        </h3>
        {loading ? (
          <p className="text-sm text-stone-500">{t("loading")}</p>
        ) : files.length === 0 ? (
          <p className="text-sm text-stone-600 dark:text-slate-300">
            {t("empty")}
          </p>
        ) : (
          <ul className="divide-y divide-stone-200 dark:divide-slate-700">
            {files.map((f) => (
              <li
                key={f.id}
                className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"
              >
                <div>
                  <p className="font-medium text-stone-900 dark:text-slate-50">
                    {f.label ? `${f.label} · ` : null}
                    {f.fileName}
                  </p>
                  <p className="text-xs text-stone-500 dark:text-slate-400">
                    {scopeLabel(f.scope)} · {formatSize(f.sizeBytes)} ·{" "}
                    {new Date(f.createdAt).toLocaleString()}
                    {f.appointmentId
                      ? ` · ${t("apptRef", { id: f.appointmentId.slice(0, 6) })}`
                      : null}
                  </p>
                </div>
                <a
                  href={f.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-teal-800 underline dark:text-teal-300"
                >
                  {t("open")}
                </a>
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-stone-500 dark:text-slate-400">
          {t("appendOnly")}
        </p>
      </div>
    </section>
  );
}
