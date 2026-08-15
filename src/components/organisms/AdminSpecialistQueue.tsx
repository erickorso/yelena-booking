"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/atoms/Button";
import { useAuth } from "@/components/providers/AuthProvider";
import { getIdToken } from "@/services/authService";

type PendingSpecialist = {
  id: string;
  userId: string;
  displayName: string;
  email: string;
  specialty: string;
  licenseNumber: string;
  location: string;
  bio: string;
  createdAt: string;
};

export function AdminSpecialistQueue() {
  const t = useTranslations("Admin");
  const { user } = useAuth();
  const [items, setItems] = useState<PendingSpecialist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    void (async () => {
      try {
        const token = await getIdToken(user);
        const response = await fetch("/api/admin/specialists/pending", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = (await response.json()) as {
          specialists?: PendingSpecialist[];
          error?: string;
        };
        if (!response.ok) {
          throw new Error(data.error ?? t("loadError"));
        }
        if (!cancelled) {
          setItems(data.specialists ?? []);
          setError(null);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : t("loadError"));
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, t, reloadKey]);

  const refresh = useCallback(() => {
    setLoading(true);
    setReloadKey((key) => key + 1);
  }, []);

  async function setStatus(id: string, status: "active" | "rejected") {
    if (!user) return;
    setBusyId(id);
    setError(null);
    try {
      const token = await getIdToken(user);
      const response = await fetch(`/api/admin/specialists/${id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? t("actionError"));
      }
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("actionError"));
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return <p className="text-sm text-stone-600 dark:text-slate-300">{t("loading")}</p>;
  }

  return (
    <section className="space-y-4" aria-labelledby="admin-queue-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2
          id="admin-queue-title"
          className="text-lg font-medium text-stone-900 dark:text-slate-50"
        >
          {t("queueTitle")}
        </h2>
        <Button type="button" variant="secondary" size="sm" onClick={refresh}>
          {t("refresh")}
        </Button>
      </div>

      {error ? (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}

      {items.length === 0 ? (
        <p className="text-sm text-stone-600 dark:text-slate-300">{t("empty")}</p>
      ) : (
        <ul className="space-y-4">
          {items.map((item) => (
            <li
              key={item.id}
              className="border-b border-stone-200 py-4 dark:border-slate-700"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="font-medium text-stone-900 dark:text-slate-50">
                    {item.displayName}
                  </p>
                  <p className="text-sm text-stone-600 dark:text-slate-300">
                    {item.email}
                  </p>
                  <p className="mt-1 text-sm text-teal-800 dark:text-teal-300">
                    {item.specialty} · {item.licenseNumber}
                  </p>
                  {item.location ? (
                    <p className="text-xs text-stone-500 dark:text-slate-400">
                      {item.location}
                    </p>
                  ) : null}
                  {item.bio ? (
                    <p className="mt-2 text-sm text-stone-600 dark:text-slate-300">
                      {item.bio}
                    </p>
                  ) : null}
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    disabled={busyId === item.id}
                    onClick={() => void setStatus(item.id, "active")}
                  >
                    {t("approve")}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={busyId === item.id}
                    onClick={() => void setStatus(item.id, "rejected")}
                  >
                    {t("reject")}
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
