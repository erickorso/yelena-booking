"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Bell } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { getIdToken } from "@/services/authService";
import { Button } from "@/components/atoms/Button";
import { Link } from "@/i18n/navigation";

type NotifItem = {
  id: string;
  kind: string;
  title: string;
  body: string;
  href: string | null;
  readAt: string | null;
  meta: Record<string, string>;
  createdAt: string;
};

export function NotificationBell() {
  const t = useTranslations("Notifications");
  const { status, user } = useAuth();
  const { success, error } = useToast();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotifItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    const token = await getIdToken(user);
    const res = await fetch("/api/notifications", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = (await res.json()) as {
      notifications?: NotifItem[];
      unread?: number;
    };
    if (res.ok) {
      setItems(data.notifications ?? []);
      setUnread(data.unread ?? 0);
    }
  }, [user]);

  useEffect(() => {
    if (status !== "authenticated" || !user) return;
    let cancelled = false;
    void (async () => {
      try {
        await load();
      } catch {
        if (!cancelled) setItems([]);
      }
    })();
    const timer = window.setInterval(() => {
      void load();
    }, 45_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [status, user, load]);

  if (status !== "authenticated") return null;

  async function markRead(id: string) {
    if (!user) return;
    const token = await getIdToken(user);
    await fetch(`/api/notifications/${id}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
    });
    await load();
  }

  async function respondTransfer(item: NotifItem, accept: boolean) {
    const appointmentId = item.meta.appointmentId;
    if (!user || !appointmentId) return;
    setBusyId(item.id);
    try {
      const token = await getIdToken(user);
      const res = await fetch(
        `/api/appointments/${appointmentId}/transfer/respond`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ accept }),
        },
      );
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? t("actionError"));
      await markRead(item.id);
      success(accept ? t("accepted") : t("rejected"));
      await load();
    } catch (err) {
      error(err instanceof Error ? err.message : t("actionError"));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        className="relative flex h-9 w-9 items-center justify-center rounded-md border border-stone-300 text-stone-700 dark:border-slate-600 dark:text-slate-200"
        aria-label={t("title")}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <Bell className="h-4 w-4" aria-hidden />
        {unread > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-teal-700 px-1 text-[10px] font-semibold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-[min(100vw-2rem,22rem)] rounded-md border border-stone-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
          <div className="border-b border-stone-200 px-3 py-2 text-sm font-medium dark:border-slate-700">
            {t("title")}
          </div>
          <ul className="max-h-80 overflow-y-auto">
            {items.length === 0 ? (
              <li className="px-3 py-4 text-sm text-stone-500 dark:text-slate-400">
                {t("empty")}
              </li>
            ) : (
              items.map((item) => (
                <li
                  key={item.id}
                  className="border-b border-stone-100 px-3 py-3 text-sm last:border-0 dark:border-slate-800"
                >
                  <p className="font-medium text-stone-900 dark:text-slate-50">
                    {item.title}
                    {!item.readAt ? (
                      <span className="ml-2 text-[10px] uppercase text-teal-700 dark:text-teal-300">
                        {t("new")}
                      </span>
                    ) : null}
                  </p>
                  <p className="mt-1 text-stone-600 dark:text-slate-300">
                    {item.body}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {item.kind === "transfer_request" && !item.readAt ? (
                      <>
                        <Button
                          type="button"
                          size="sm"
                          disabled={busyId === item.id}
                          onClick={() => void respondTransfer(item, true)}
                        >
                          {t("accept")}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          disabled={busyId === item.id}
                          onClick={() => void respondTransfer(item, false)}
                        >
                          {t("reject")}
                        </Button>
                      </>
                    ) : null}
                    {item.href ? (
                      <Link
                        href={item.href}
                        className="text-xs font-medium text-teal-800 underline dark:text-teal-300"
                        onClick={() => {
                          void markRead(item.id);
                          setOpen(false);
                        }}
                      >
                        {t("open")}
                      </Link>
                    ) : (
                      <button
                        type="button"
                        className="text-xs text-stone-500 underline"
                        onClick={() => void markRead(item.id)}
                      >
                        {t("markRead")}
                      </button>
                    )}
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
