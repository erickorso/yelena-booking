"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/atoms/Button";
import { useAuth } from "@/components/providers/AuthProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { getIdToken } from "@/services/authService";

type StatusPayload = {
  configured?: boolean;
  connected?: boolean;
  googleEmail?: string | null;
  error?: string;
};

/**
 * Connect / disconnect Google Calendar — copy aimed at non-technical specialists.
 */
export function GoogleCalendarConnect() {
  const t = useTranslations("GoogleCalendar");
  const { user } = useAuth();
  const { success, error: toastError } = useToast();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [connected, setConnected] = useState(false);
  const [googleEmail, setGoogleEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void (async () => {
      try {
        const token = await getIdToken(user);
        const res = await fetch("/api/integrations/google", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = (await res.json()) as StatusPayload;
        if (cancelled) return;
        if (!res.ok) {
          toastError(data.error ?? t("statusError"));
          return;
        }
        setConfigured(Boolean(data.configured));
        setConnected(Boolean(data.connected));
        setGoogleEmail(data.googleEmail ?? null);
      } catch {
        if (!cancelled) toastError(t("statusError"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, toastError, t]);

  async function connect() {
    if (!user) return;
    setBusy(true);
    try {
      const token = await getIdToken(user);
      const res = await fetch("/api/integrations/google/connect", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        toastError(data.error ?? t("connectError"));
        return;
      }
      window.location.href = data.url;
    } catch {
      toastError(t("connectError"));
      setBusy(false);
    }
  }

  async function disconnect() {
    if (!user) return;
    setBusy(true);
    try {
      const token = await getIdToken(user);
      const res = await fetch("/api/integrations/google", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        toastError(data.error ?? t("disconnectError"));
        return;
      }
      setConnected(false);
      setGoogleEmail(null);
      success(t("disconnectSuccess"));
    } catch {
      toastError(t("disconnectError"));
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-stone-600 dark:text-slate-300">{t("loading")}</p>;
  }

  return (
    <section
      aria-labelledby="gcal-title"
      className="space-y-4 border-t border-stone-200 pt-6 dark:border-slate-700"
    >
      <div>
        <h3
          id="gcal-title"
          className="font-serif text-lg text-stone-900 dark:text-slate-100"
        >
          {t("title")}
        </h3>
        <p className="mt-1 text-sm text-stone-600 dark:text-slate-300">
          {t("subtitle")}
        </p>
      </div>

      {!configured ? (
        <p
          role="status"
          className="rounded-md border border-amber-500/30 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-400/30 dark:bg-amber-950/40 dark:text-amber-100"
        >
          {t("notConfigured")}
        </p>
      ) : connected ? (
        <div className="space-y-3">
          <p className="text-sm font-medium text-stone-800 dark:text-slate-100">
            {t("connectedTitle")}
          </p>
          <p className="text-sm text-stone-700 dark:text-slate-200">
            {t("connectedAs", { email: googleEmail ?? "Google" })}
          </p>
          <p className="text-sm text-stone-600 dark:text-slate-300">
            {t("connectedHint")}
          </p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={busy}
            onClick={() => void disconnect()}
          >
            {busy ? t("disconnecting") : t("disconnect")}
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium text-stone-800 dark:text-slate-100">
              {t("howToTitle")}
            </p>
            <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm text-stone-600 dark:text-slate-300">
              <li>{t("step1")}</li>
              <li>{t("step2")}</li>
              <li>{t("step3")}</li>
              <li>{t("step4")}</li>
            </ol>
          </div>
          <ul className="space-y-1 text-sm text-stone-600 dark:text-slate-300">
            <li>· {t("benefit1")}</li>
            <li>· {t("benefit2")}</li>
            <li>· {t("benefit3")}</li>
          </ul>
          <p className="text-xs text-stone-500 dark:text-slate-400">
            {t("privacyNote")}
          </p>
          <Button
            type="button"
            size="sm"
            disabled={busy}
            onClick={() => void connect()}
          >
            {busy ? t("connecting") : t("connect")}
          </Button>
        </div>
      )}
    </section>
  );
}
