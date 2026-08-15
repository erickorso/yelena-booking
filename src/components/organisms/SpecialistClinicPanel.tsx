"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { useAuth } from "@/components/providers/AuthProvider";
import { getIdToken } from "@/services/authService";

type PatientOption = {
  id: string;
  email: string;
  displayName: string;
};

type AppointmentRow = {
  id: string;
  patientId: string;
  startsAt: string;
  endsAt: string;
  status: string;
};

/**
 * Active specialist: register patients, book for them, list own clinic schedule.
 */
export function SpecialistClinicPanel() {
  const t = useTranslations("Clinic");
  const { user } = useAuth();
  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPending, setRegPending] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  const [patientId, setPatientId] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [bookPending, setBookPending] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void (async () => {
      setError(null);
      const token = await getIdToken(user);
      const [patientsRes, apptsRes] = await Promise.all([
        fetch("/api/specialists/patients", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/appointments?as=specialist", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      const patientsData = (await patientsRes.json()) as {
        patients?: PatientOption[];
        error?: string;
      };
      const apptsData = (await apptsRes.json()) as {
        appointments?: AppointmentRow[];
        error?: string;
      };
      if (cancelled) return;
      if (!patientsRes.ok) {
        setError(patientsData.error ?? t("loadError"));
        return;
      }
      setPatients(patientsData.patients ?? []);
      if (apptsRes.ok) {
        setAppointments(apptsData.appointments ?? []);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, t, reloadKey]);

  async function registerPatient(event: React.FormEvent) {
    event.preventDefault();
    if (!user) return;
    setRegPending(true);
    setError(null);
    setTempPassword(null);
    setInfo(null);
    try {
      const token = await getIdToken(user);
      const response = await fetch("/api/specialists/patients", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: regEmail,
          displayName: regName,
        }),
      });
      const data = (await response.json()) as {
        error?: string;
        temporaryPassword?: string;
        patient?: PatientOption;
      };
      if (!response.ok) {
        throw new Error(data.error ?? t("registerError"));
      }
      setTempPassword(data.temporaryPassword ?? null);
      setInfo(t("registerSuccess"));
      setRegName("");
      setRegEmail("");
      setReloadKey((k) => k + 1);
      if (data.patient) setPatientId(data.patient.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("registerError"));
    } finally {
      setRegPending(false);
    }
  }

  async function bookAppointment(event: React.FormEvent) {
    event.preventDefault();
    if (!user) return;
    setBookPending(true);
    setError(null);
    setInfo(null);
    try {
      const token = await getIdToken(user);
      const start = new Date(startsAt);
      const end = endsAt
        ? new Date(endsAt)
        : new Date(start.getTime() + 30 * 60 * 1000);
      const response = await fetch("/api/appointments", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          patientId,
          specialistId: user.uid,
          startsAt: start.toISOString(),
          endsAt: end.toISOString(),
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? t("bookError"));
      }
      setInfo(t("bookSuccess"));
      setStartsAt("");
      setEndsAt("");
      setReloadKey((k) => k + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("bookError"));
    } finally {
      setBookPending(false);
    }
  }

  return (
    <div className="space-y-8">
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

      <form
        onSubmit={(e) => void registerPatient(e)}
        className="space-y-4 rounded-md border border-stone-200 p-4 dark:border-slate-700"
      >
        <h2 className="font-serif text-xl text-teal-800 dark:text-teal-300">
          {t("registerTitle")}
        </h2>
        <p className="text-sm text-stone-600 dark:text-slate-300">
          {t("registerSubtitle")}
        </p>
        <Input
          label={t("displayName")}
          name="patientName"
          value={regName}
          onChange={(e) => setRegName(e.target.value)}
          required
        />
        <Input
          label={t("email")}
          name="patientEmail"
          type="email"
          value={regEmail}
          onChange={(e) => setRegEmail(e.target.value)}
          required
        />
        {tempPassword ? (
          <p
            role="status"
            className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:bg-amber-950/40 dark:text-amber-100"
          >
            {t("tempPassword", { password: tempPassword })}
          </p>
        ) : null}
        <Button type="submit" disabled={regPending}>
          {regPending ? t("registering") : t("registerCta")}
        </Button>
      </form>

      <form
        onSubmit={(e) => void bookAppointment(e)}
        className="space-y-4 rounded-md border border-stone-200 p-4 dark:border-slate-700"
      >
        <h2 className="font-serif text-xl text-teal-800 dark:text-teal-300">
          {t("bookTitle")}
        </h2>
        <p className="text-sm text-stone-600 dark:text-slate-300">
          {t("bookSubtitle")}
        </p>
        <label className="flex flex-col gap-1.5 text-sm text-stone-800 dark:text-slate-100">
          <span className="font-medium">{t("patient")}</span>
          <select
            className="h-10 rounded-md border border-stone-300 bg-white px-3 dark:border-slate-600 dark:bg-slate-900"
            value={patientId}
            onChange={(e) => setPatientId(e.target.value)}
            required
          >
            <option value="">{t("patientPlaceholder")}</option>
            {patients
              .filter((p) => p.id !== user?.uid)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.displayName} · {p.email}
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
        <Input
          label={t("endsAt")}
          name="endsAt"
          type="datetime-local"
          value={endsAt}
          onChange={(e) => setEndsAt(e.target.value)}
        />
        <Button type="submit" disabled={bookPending || !patientId}>
          {bookPending ? t("booking") : t("bookCta")}
        </Button>
      </form>

      <section className="space-y-3">
        <h2 className="font-serif text-xl text-teal-800 dark:text-teal-300">
          {t("scheduleTitle")}
        </h2>
        {appointments.length === 0 ? (
          <p className="text-sm text-stone-600 dark:text-slate-300">
            {t("scheduleEmpty")}
          </p>
        ) : (
          <ul className="space-y-2">
            {appointments.map((a) => {
              const patient = patients.find((p) => p.id === a.patientId);
              return (
                <li
                  key={a.id}
                  className="border-b border-stone-200 py-2 text-sm dark:border-slate-700"
                >
                  <span className="font-medium">
                    {patient?.displayName ?? a.patientId}
                  </span>
                  {" · "}
                  {new Date(a.startsAt).toLocaleString()}
                  {" · "}
                  {a.status}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
