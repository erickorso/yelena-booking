"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { useAuth } from "@/components/providers/AuthProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { getIdToken } from "@/services/authService";

type MailStatus = {
  configured: boolean;
  fromHint: string;
};

/**
 * Admin-only: fire Resend templates against real appointments.
 */
export function AdminMailTestPanel() {
  const t = useTranslations("AdminMail");
  const { user } = useAuth();
  const { success, error: toastError } = useToast();
  const [status, setStatus] = useState<MailStatus | null>(null);
  const [to, setTo] = useState("");
  const [appointmentId, setAppointmentId] = useState("");
  const [template, setTemplate] = useState<"smoke" | "appointment" | "transfer">(
    "smoke",
  );
  const [pending, setPending] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void (async () => {
      const token = await getIdToken(user);
      const res = await fetch("/api/admin/mail/test", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = (await res.json()) as MailStatus & { error?: string };
      if (!cancelled && res.ok) {
        setStatus({ configured: data.configured, fromHint: data.fromHint });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  async function send() {
    if (!user) return;
    setPending(true);
    setLastResult(null);
    try {
      const token = await getIdToken(user);
      const res = await fetch("/api/admin/mail/test", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          template,
          to: to.trim() || undefined,
          appointmentId: appointmentId.trim() || undefined,
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        ok?: boolean;
        to?: string;
        result?: { ok?: boolean; id?: string | null; error?: string };
      };
      if (!res.ok) throw new Error(data.error ?? t("sendError"));
      if (data.result && data.result.ok === false) {
        throw new Error(data.result.error ?? t("sendError"));
      }
      const msg = t("sendSuccess", {
        to: data.to ?? to,
        id: data.result?.id ?? "—",
      });
      setLastResult(msg);
      success(msg);
    } catch (err) {
      const msg = err instanceof Error ? err.message : t("sendError");
      setLastResult(msg);
      toastError(msg);
    } finally {
      setPending(false);
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
        {status ? (
          <p className="mt-2 text-xs text-stone-500 dark:text-slate-400">
            {status.configured ? t("configured", { from: status.fromHint }) : t("missingKey")}
          </p>
        ) : null}
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">{t("template")}</legend>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["smoke", t("tplSmoke")],
              ["appointment", t("tplAppointment")],
              ["transfer", t("tplTransfer")],
            ] as const
          ).map(([id, label]) => (
            <Button
              key={id}
              type="button"
              size="sm"
              variant={template === id ? "primary" : "secondary"}
              onClick={() => setTemplate(id)}
            >
              {label}
            </Button>
          ))}
        </div>
      </fieldset>

      <Input
        label={t("to")}
        name="mailTo"
        type="email"
        value={to}
        onChange={(e) => setTo(e.target.value)}
        placeholder={t("toPlaceholder")}
      />
      {template !== "smoke" ? (
        <Input
          label={t("appointmentId")}
          name="appointmentId"
          value={appointmentId}
          onChange={(e) => setAppointmentId(e.target.value)}
          placeholder={t("appointmentPlaceholder")}
        />
      ) : null}

      <Button type="button" disabled={pending || status?.configured === false} onClick={() => void send()}>
        {pending ? t("sending") : t("sendCta")}
      </Button>

      {lastResult ? (
        <p role="status" className="text-sm text-stone-700 dark:text-slate-200">
          {lastResult}
        </p>
      ) : null}
    </section>
  );
}
