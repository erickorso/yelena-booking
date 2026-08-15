"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { SearchableSelect } from "@/components/molecules/SearchableSelect";
import { WeekCalendar, type CalendarSlot } from "@/components/molecules/WeekCalendar";
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
  const [selectedSlot, setSelectedSlot] = useState<CalendarSlot | null>(null);
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
    if (!user || !selectedSlot) return;
    setBookPending(true);
    setError(null);
    setInfo(null);
    try {
      const token = await getIdToken(user);
      const response = await fetch("/api/appointments", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          patientId,
          specialistId: user.uid,
          startsAt: selectedSlot.startsAt,
          endsAt: selectedSlot.endsAt,
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? t("bookError"));
      }
      setInfo(t("bookSuccess"));
      setSelectedSlot(null);
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
        <SearchableSelect
          label={t("patient")}
          placeholder={t("patientPlaceholder")}
          searchPlaceholder={t("patientSearch")}
          emptyLabel={t("patientEmpty")}
          name="patientId"
          required
          value={patientId}
          onChange={setPatientId}
          options={patients
            .filter((p) => p.id !== user?.uid)
            .map((p) => ({
              id: p.id,
              label: `${p.displayName} · ${p.email}`,
              searchText: `${p.displayName} ${p.email}`,
            }))}
        />
        <WeekCalendar
          events={appointments
            .filter((a) => a.status !== "cancelled")
            .map((a) => {
              const patient = patients.find((p) => p.id === a.patientId);
              return {
                id: a.id,
                startsAt: new Date(a.startsAt),
                endsAt: new Date(a.endsAt),
                title: patient?.displayName ?? a.patientId.slice(0, 8),
                status: a.status,
              };
            })}
          selectedSlot={selectedSlot}
          onSelectSlot={setSelectedSlot}
          labels={{
            today: t("calToday"),
            weekOf: t("calWeek"),
            hint: t("calHint"),
            selected: t("calSelected"),
          }}
        />
        <Button type="submit" disabled={bookPending || !patientId || !selectedSlot}>
          {bookPending ? t("booking") : t("bookCta")}
        </Button>
      </form>
    </div>
  );
}
