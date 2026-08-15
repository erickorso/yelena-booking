"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/atoms/Button";
import { SearchableSelect } from "@/components/molecules/SearchableSelect";
import { SlotPicker, type SlotIso } from "@/components/molecules/SlotPicker";
import { useAuth } from "@/components/providers/AuthProvider";
import { getIdToken } from "@/services/authService";
import { toDateInputValue } from "@/lib/availability/defaultSlots";

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
  const [selectedSlot, setSelectedSlot] = useState<SlotIso | null>(null);
  const [remoteSlots, setRemoteSlots] = useState<SlotIso[] | null>(null);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [dateYmd, setDateYmd] = useState(() => toDateInputValue(new Date()));
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

  useEffect(() => {
    if (!user || !specialistId) {
      return;
    }
    let cancelled = false;
    void (async () => {
      setSlotsLoading(true);
      try {
        const token = await getIdToken(user);
        const res = await fetch(
          `/api/specialists/${specialistId}/slots?date=${dateYmd}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        const data = (await res.json()) as { slots?: SlotIso[]; error?: string };
        if (!cancelled) {
          setRemoteSlots(res.ok ? (data.slots ?? []) : []);
        }
      } catch {
        if (!cancelled) setRemoteSlots([]);
      } finally {
        if (!cancelled) setSlotsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, specialistId, dateYmd]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!user || !selectedSlot) return;
    setPending(true);
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
          patientId: user.uid,
          specialistId,
          startsAt: selectedSlot.startsAt,
          endsAt: selectedSlot.endsAt,
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
      setSelectedSlot(null);
      if (data.appointment) {
        setAppointments((prev) => [...prev, data.appointment!]);
      }
      setDateYmd((d) => d);
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
        <SearchableSelect
          label={t("specialist")}
          placeholder={t("specialistPlaceholder")}
          searchPlaceholder={t("specialistSearch")}
          emptyLabel={t("specialistEmpty")}
          value={specialistId}
          onChange={(id) => {
            setSpecialistId(id);
            setSelectedSlot(null);
            setRemoteSlots(null);
          }}
          options={specialists
            .filter((s) => s.id !== user?.uid)
            .map((s) => ({
              id: s.id,
              label: `${s.displayName} · ${s.specialty}`,
              searchText: `${s.displayName} ${s.specialty}`,
            }))}
        />
        {specialistId ? (
          <SlotPicker
            labelDate={t("pickDate")}
            labelSlots={t("pickSlot")}
            emptyLabel={t("noSlots")}
            weekendLabel={t("weekend")}
            busy={[]}
            remoteSlots={remoteSlots}
            remoteLoading={slotsLoading}
            value={selectedSlot?.startsAt ?? null}
            onChange={setSelectedSlot}
            onDateChange={(d) => {
              setDateYmd(d);
              setSelectedSlot(null);
            }}
          />
        ) : null}
        <p className="text-xs text-stone-500 dark:text-slate-400">{t("hoursHint")}</p>
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
        <Button type="submit" disabled={pending || !specialistId || !selectedSlot}>
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
