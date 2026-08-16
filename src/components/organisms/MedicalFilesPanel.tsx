"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { ListSkeleton } from "@/components/atoms/Skeleton";
import { CollapsibleSection } from "@/components/molecules/CollapsibleSection";
import { SearchableSelect } from "@/components/molecules/SearchableSelect";
import { useAuth } from "@/components/providers/AuthProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { getIdToken } from "@/services/authService";
import type { MedicalFileScope } from "@/types/domain";
import {
  MAX_MEDICAL_FILE_BYTES,
  MAX_MEDICAL_FILE_MB,
} from "@/lib/storage/medicalUploadPolicy";

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

type AppointmentOption = {
  id: string;
  patientId?: string;
  startsAt: string;
  endsAt: string;
  status: string;
  specialistId: string;
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
 * Patient chart can tag files to general history or a specific visit (default: latest).
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
  const [appointments, setAppointments] = useState<AppointmentOption[]>([]);
  const [pickedPatientId, setPickedPatientId] = useState("");
  const [scope, setScope] = useState<MedicalFileScope>(
    mode === "specialist_library" ? "specialist_profile" : "appointment",
  );
  const [appointmentId, setAppointmentId] = useState("");
  const [label, setLabel] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const targetPatientId =
    mode === "specialist_library"
      ? ""
      : (fixedPatientId ||
        (allowPickPatient ? pickedPatientId : (user?.uid ?? "")));

  const visitOptions = useMemo(() => {
    if (mode !== "patient_chart" || !targetPatientId) return [];
    return [...appointments]
      .filter((a) => a.status !== "cancelled")
      .filter((a) => !a.patientId || a.patientId === targetPatientId)
      .sort(
        (a, b) =>
          new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime(),
      );
  }, [appointments, mode, targetPatientId]);

  const latestVisitId = visitOptions[0]?.id ?? "";

  const resolvedAppointmentId = useMemo(() => {
    if (scope !== "appointment") return "";
    if (appointmentId && visitOptions.some((v) => v.id === appointmentId)) {
      return appointmentId;
    }
    return latestVisitId;
  }, [scope, appointmentId, visitOptions, latestVisitId]);

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

  useEffect(() => {
    if (!user || mode !== "patient_chart" || !targetPatientId) {
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const token = await getIdToken(user);
        const asSelf = targetPatientId === user.uid;
        const res = await fetch(
          asSelf
            ? "/api/appointments?as=patient"
            : "/api/appointments?as=specialist",
          { headers: { Authorization: `Bearer ${token}` } },
        );
        const data = (await res.json()) as {
          appointments?: AppointmentOption[];
        };
        if (cancelled || !res.ok) return;
        const rows = (data.appointments ?? []).filter((a) =>
          asSelf ? true : a.patientId === targetPatientId,
        );
        setAppointments(rows);
      } catch {
        if (!cancelled) setAppointments([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, mode, targetPatientId]);

  async function onUpload(event: React.FormEvent) {
    event.preventDefault();
    if (!user || !file) return;
    if (file.size > MAX_MEDICAL_FILE_BYTES) {
      toastError(t("tooLarge", { maxMb: MAX_MEDICAL_FILE_MB }));
      return;
    }
    if (mode === "patient_chart" && !targetPatientId) {
      toastError(t("pickPatient"));
      return;
    }
    if (scope === "appointment") {
      if (visitOptions.length === 0) {
        toastError(t("noVisits"));
        return;
      }
      if (!resolvedAppointmentId) {
        toastError(t("pickVisit"));
        return;
      }
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
      if (scope === "appointment" && resolvedAppointmentId) {
        body.set("appointmentId", resolvedAppointmentId);
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

  async function openFile(f: FileRow) {
    if (!user) return;
    setOpeningId(f.id);
    try {
      const token = await getIdToken(user);
      const res = await fetch(`/api/files/${f.id}/content`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? t("openError"));
      }
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const opened = window.open(objectUrl, "_blank", "noopener,noreferrer");
      if (!opened) {
        // Popup blocked — fall back to same-tab navigation.
        window.location.assign(objectUrl);
      }
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    } catch (err) {
      toastError(err instanceof Error ? err.message : t("openError"));
    } finally {
      setOpeningId(null);
    }
  }

  function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function formatVisit(a: AppointmentOption, isLatest: boolean): string {
    const when = new Date(a.startsAt).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
    return isLatest
      ? t("visitOptionLatest", { when })
      : t("visitOption", { when, status: a.status });
  }

  function appointmentLabel(id: string | null): string | null {
    if (!id) return null;
    const a = visitOptions.find((v) => v.id === id);
    if (!a) return t("apptRef", { id: id.slice(0, 6) });
    return new Date(a.startsAt).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  function scopeLabel(s: string): string {
    if (s === "patient_general") return t("scopeGeneral");
    if (s === "appointment") return t("scopeVisit");
    if (s === "specialist_profile") return t("scopeLibrary");
    return s;
  }

  return (
    <CollapsibleSection
      title={mode === "specialist_library" ? t("libraryTitle") : t("chartTitle")}
      subtitle={t("subtitle")}
      defaultOpen={mode !== "specialist_library"}
    >
      <form onSubmit={(e) => void onUpload(e)} className="space-y-3">
        {allowPickPatient ? (
          <SearchableSelect
            label={t("patient")}
            placeholder={t("patientPlaceholder")}
            searchPlaceholder={t("patientSearch")}
            emptyLabel={t("patientEmpty")}
            value={pickedPatientId}
            onChange={(id) => {
              setPickedPatientId(id);
              setAppointmentId("");
            }}
            options={patients.map((p) => ({
              id: p.id,
              label: `${p.displayName} · ${p.email}`,
              searchText: `${p.displayName} ${p.email}`,
            }))}
          />
        ) : null}

        {mode === "patient_chart" ? (
          <fieldset className="space-y-3">
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
                onClick={() => {
                  setScope("appointment");
                  if (latestVisitId) setAppointmentId(latestVisitId);
                }}
              >
                {t("scopeVisit")}
              </Button>
            </div>

            {scope === "appointment" ? (
              visitOptions.length === 0 ? (
                <p role="status" className="text-sm text-amber-800 dark:text-amber-200">
                  {t("noVisits")}
                </p>
              ) : (
                <label className="flex flex-col gap-1.5 text-sm">
                  <span className="font-medium">{t("visitLabel")}</span>
                  <select
                    value={resolvedAppointmentId}
                    onChange={(e) => setAppointmentId(e.target.value)}
                    className="h-10 rounded-md border border-stone-300 bg-white px-3 dark:border-slate-600 dark:bg-slate-900"
                    required
                    aria-describedby="medical-file-visit-hint"
                  >
                    {visitOptions.map((a, idx) => (
                      <option key={a.id} value={a.id}>
                        {formatVisit(a, idx === 0)}
                      </option>
                    ))}
                  </select>
                  <span
                    id="medical-file-visit-hint"
                    className="text-xs text-stone-500 dark:text-slate-400"
                  >
                    {t("visitHint")}
                  </span>
                </label>
              )
            ) : null}
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
            onChange={(e) => {
              const next = e.target.files?.[0] ?? null;
              if (next && next.size > MAX_MEDICAL_FILE_BYTES) {
                toastError(t("tooLarge", { maxMb: MAX_MEDICAL_FILE_MB }));
                e.target.value = "";
                setFile(null);
                return;
              }
              setFile(next);
            }}
            className="text-sm file:mr-3 file:rounded-md file:border-0 file:bg-teal-700 file:px-3 file:py-2 file:text-white"
            required
          />
          <span className="text-xs text-stone-500 dark:text-slate-400">
            {t("formats", { maxMb: MAX_MEDICAL_FILE_MB })}
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
        {mode === "patient_chart" && !targetPatientId ? (
          <p className="text-sm text-stone-600 dark:text-slate-300">
            {t("pickPatient")}
          </p>
        ) : loading ? (
          <ListSkeleton rows={3} />
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
                      ? ` · ${t("taggedVisit", {
                          when: appointmentLabel(f.appointmentId) ?? f.appointmentId.slice(0, 6),
                        })}`
                      : null}
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={openingId === f.id}
                  onClick={() => void openFile(f)}
                >
                  {openingId === f.id ? t("opening") : t("open")}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </CollapsibleSection>
  );
}
