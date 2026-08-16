"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { ListSkeleton } from "@/components/atoms/Skeleton";
import { SpecialtyPicker } from "@/components/molecules/SpecialtyPicker";
import { useAuth } from "@/components/providers/AuthProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { getIdToken } from "@/services/authService";

type AdminPatientRow = {
  id: string;
  email: string;
  displayName: string;
  patientNumber?: string;
  locale: string;
  timezone: string | null;
  createdAt: string;
  canPromote: boolean;
  specialistStatus: string | null;
  specialty: string | null;
};

const PAGE_SIZE = 10;

/**
 * Admin: review patient public data (search + pagination) and promote.
 */
export function AdminPatientsPanel() {
  const t = useTranslations("AdminPatients");
  const { user } = useAuth();
  const { success, error: toastError } = useToast();
  const [items, setItems] = useState<AdminPatientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [queryInput, setQueryInput] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);

  const [promoteId, setPromoteId] = useState<string | null>(null);
  const [promoteName, setPromoteName] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setDebouncedQ(queryInput.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(handle);
  }, [queryInput]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const token = await getIdToken(user);
        const params = new URLSearchParams({
          page: String(page),
          pageSize: String(PAGE_SIZE),
        });
        if (debouncedQ) params.set("q", debouncedQ);
        const res = await fetch(`/api/admin/patients?${params}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = (await res.json()) as {
          patients?: AdminPatientRow[];
          page?: number;
          total?: number;
          totalPages?: number;
          error?: string;
        };
        if (cancelled) return;
        if (!res.ok) {
          setError(data.error ?? t("loadError"));
          return;
        }
        setItems(data.patients ?? []);
        setTotal(data.total ?? 0);
        setTotalPages(data.totalPages ?? 1);
        if (typeof data.page === "number") setPage(data.page);
        setError(null);
      } catch {
        if (!cancelled) setError(t("loadError"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, t, page, debouncedQ, reloadKey]);

  function openPromote(row: AdminPatientRow) {
    setPromoteId(row.id);
    setPromoteName(row.displayName);
    setSpecialty("");
    setLicenseNumber("");
  }

  async function submitPromote(activate: boolean) {
    if (!user || !promoteId) return;
    setBusy(true);
    setError(null);
    try {
      const token = await getIdToken(user);
      const res = await fetch(`/api/admin/patients/${promoteId}/promote`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ specialty, licenseNumber, activate }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? t("promoteError"));
      }
      success(activate ? t("promoteActiveSuccess") : t("promotePendingSuccess"));
      setPromoteId(null);
      setReloadKey((k) => k + 1);
    } catch (err) {
      const msg = err instanceof Error ? err.message : t("promoteError");
      setError(msg);
      toastError(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-4" aria-labelledby="admin-patients-title">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2
            id="admin-patients-title"
            className="text-lg font-medium text-stone-900 dark:text-slate-50"
          >
            {t("title")}
          </h2>
          <p className="mt-1 text-sm text-stone-600 dark:text-slate-300">
            {t("subtitle")}
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => setReloadKey((k) => k + 1)}
        >
          {t("refresh")}
        </Button>
      </div>

      <Input
        label={t("search")}
        name="patientSearch"
        value={queryInput}
        onChange={(e) => setQueryInput(e.target.value)}
        placeholder={t("searchPlaceholder")}
        autoComplete="off"
      />

      {error ? (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}

      {loading ? (
        <ListSkeleton rows={5} />
      ) : items.length === 0 ? (
        <p className="text-sm text-stone-600 dark:text-slate-300">{t("empty")}</p>
      ) : (
        <ul className="divide-y divide-stone-200 dark:divide-slate-700">
          {items.map((p) => (
            <li
              key={p.id}
              className="flex flex-wrap items-start justify-between gap-3 py-4"
            >
              <div>
                <p className="font-medium text-stone-900 dark:text-slate-50">
                  {p.displayName}
                </p>
                <p className="text-sm text-stone-600 dark:text-slate-300">
                  {p.email}
                </p>
                {p.patientNumber ? (
                  <p className="text-sm text-stone-500 dark:text-slate-400">
                    {p.patientNumber}
                  </p>
                ) : null}
                <p className="mt-1 text-xs text-stone-500 dark:text-slate-400">
                  {t("meta", {
                    language: p.locale.toUpperCase(),
                    zone: p.timezone ?? "—",
                    joined: new Date(p.createdAt).toLocaleDateString(),
                  })}
                </p>
              </div>
              {p.canPromote ? (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => openPromote(p)}
                >
                  {t("promoteCta")}
                </Button>
              ) : (
                <p className="text-xs text-stone-500 dark:text-slate-400">
                  {t("alreadySpecialist", {
                    status: p.specialistStatus ?? "—",
                  })}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      <nav
        aria-label={t("paginationLabel")}
        className="flex flex-wrap items-center justify-between gap-3"
      >
        <p className="text-sm text-stone-600 dark:text-slate-300">
          {t("pageInfo", { page, totalPages, total })}
        </p>
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={loading || page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            {t("prev")}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={loading || page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            {t("next")}
          </Button>
        </div>
      </nav>

      {promoteId ? (
        <div
          role="dialog"
          aria-labelledby="promote-dialog-title"
          className="space-y-3 border border-stone-200 p-4 dark:border-slate-700"
        >
          <h3
            id="promote-dialog-title"
            className="font-medium text-stone-900 dark:text-slate-50"
          >
            {t("promoteTitle", { name: promoteName })}
          </h3>
          <p className="text-sm text-stone-600 dark:text-slate-300">
            {t("promoteHint")}
          </p>
          <SpecialtyPicker
            name="specialty"
            required
            value={specialty}
            onChange={setSpecialty}
          />
          <Input
            label={t("licenseNumber")}
            name="licenseNumber"
            value={licenseNumber}
            onChange={(e) => setLicenseNumber(e.target.value)}
            required
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              disabled={busy || !specialty.trim() || !licenseNumber.trim()}
              onClick={() => void submitPromote(true)}
            >
              {busy ? t("promoting") : t("promoteAndActivate")}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={busy || !specialty.trim() || !licenseNumber.trim()}
              onClick={() => void submitPromote(false)}
            >
              {t("promotePending")}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={busy}
              onClick={() => setPromoteId(null)}
            >
              {t("cancel")}
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
