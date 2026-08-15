"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { useAuth } from "@/components/providers/AuthProvider";
import { getIdToken } from "@/services/authService";

type SpecialistOption = {
  id: string;
  displayName: string;
  specialty: string;
};

type AppointmentRow = {
  id: string;
  specialistId: string;
  startsAt: string;
  status: string;
};

/**
 * Any authenticated patient-capable user books for themselves.
 */
export function BookSelfAppointmentForm() {
  const t = useTranslations("PatientBooking");
  const { user } = useAuth();
  const [specialists, setSpecialists] = useState<SpecialistOption[]>([]);
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [specialistId, setSpecialistId] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user) return;
      try {
        const token = await getIdToken(user);
        const [dirRes, apptRes] = await Promise.all([
          fetch("/api/specialists"),
          fetch("/api/appointments?as=patient", {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);
        const dirData = (await dirRes.json()) as {
          specialists?: SpecialistOption[];
        };
        const apptData = (await apptRes.json()) as {
          appointments?: AppointmentRow[];
        };
        if (!cancelled) {
          setSpecialists(dirData.specialists ?? []);
          if (apptRes.ok) setAppointments(apptData.appointments ?? []);
        }
      } catch {
        if (!cancelled) setError(t("loadError"));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, t]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!user) return;
    setPending(true);
    setError(null);
    setInfo(null);
    try {
      const token = await getIdToken(user);
      const start = new Date(startsAt);
      const end = new Date(start.getTime() + 30 * 60 * 1000);
      const response = await fetch("/api/appointments", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          patientId: user.uid,
          specialistId,
          startsAt: start.toISOString(),
          endsAt: end.toISOString(),
        }),
      });
      const data = (await response.json()) as {
        error?: string;
        appointment?: AppointmentRow;
      };
      if (!response.ok) {
        throw new Error(data.error ?? t("bookError"));
      }
      setInfo(t("bookSuccess"));
      setStartsAt("");
      if (data.appointment) {
        setAppointments((prev) => [...prev, data.appointment!]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("bookError"));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={(e) => void onSubmit(e)}
        className="space-y-4 rounded-md border border-stone-200 p-4 dark:border-slate-700"
      >
        <h2 className="font-serif text-xl text-teal-800 dark:text-teal-300">
          {t("title")}
        </h2>
        <p className="text-sm text-stone-600 dark:text-slate-300">{t("subtitle")}</p>
        <label className="flex flex-col gap-1.5 text-sm text-stone-800 dark:text-slate-100">
          <span className="font-medium">{t("specialist")}</span>
          <select
            className="h-10 rounded-md border border-stone-300 bg-white px-3 dark:border-slate-600 dark:bg-slate-900"
            value={specialistId}
            onChange={(e) => setSpecialistId(e.target.value)}
            required
          >
            <option value="">{t("specialistPlaceholder")}</option>
            {specialists
              .filter((s) => s.id !== user?.uid)
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.displayName} · {s.specialty}
                </option>
              ))}
          </select>
        </label>
        <Input
          label={t("startsAt")}
          name="startsAt"
          type="datetime-local"
          value={startsAt}
          onChange={(e) => setStartsAt(e.target.value)}
          required
        />
        {error ? (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        ) : null}
        {info ? (
          <p role="status" className="text-sm text-teal-800 dark:text-teal-300">
            {info}
          </p>
        ) : null}
        <Button type="submit" disabled={pending || !specialistId}>
          {pending ? t("booking") : t("bookCta")}
        </Button>
      </form>

      <section className="space-y-2">
        <h3 className="font-medium text-stone-800 dark:text-slate-100">
          {t("myAppointments")}
        </h3>
        {appointments.length === 0 ? (
          <p className="text-sm text-stone-600 dark:text-slate-300">
            {t("empty")}
          </p>
        ) : (
          <ul className="space-y-2 text-sm">
            {appointments.map((a) => (
              <li
                key={a.id}
                className="border-b border-stone-200 py-2 dark:border-slate-700"
              >
                {new Date(a.startsAt).toLocaleString()} · {a.status}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
