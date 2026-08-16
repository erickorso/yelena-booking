"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/atoms/Button";
import { SearchableSelect } from "@/components/molecules/SearchableSelect";
import { SlotPicker, type SlotIso } from "@/components/molecules/SlotPicker";
import { useAuth } from "@/components/providers/AuthProvider";
import { useToast } from "@/components/providers/ToastProvider";
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
  endsAt: string;
  status: string;
  rescheduledToId?: string | null;
};

/**
 * Any authenticated patient-capable user books for themselves.
 */
export function BookSelfAppointmentForm() {
  const t = useTranslations("PatientBooking");
  const { user } = useAuth();
  const { success, error: toastError } = useToast();
  const [specialists, setSpecialists] = useState<SpecialistOption[]>([]);
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [specialistId, setSpecialistId] = useState("");
  const [selectedSlot, setSelectedSlot] = useState<SlotIso | null>(null);
  const [remoteSlots, setRemoteSlots] = useState<SlotIso[] | null>(null);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [dateYmd, setDateYmd] = useState(() => toDateInputValue(new Date()));
  const [pending, setPending] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [rebookId, setRebookId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const activeAppointments = useMemo(
    () =>
      appointments.filter(
        (a) => a.status === "pending" || a.status === "confirmed",
      ),
    [appointments],
  );
  const cancelledAppointments = useMemo(
    () =>
      [...appointments]
        .filter((a) => a.status === "cancelled")
        .sort(
          (a, b) =>
            new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime(),
        ),
    [appointments],
  );

  async function reloadAppointments(token: string) {
    const apptRes = await fetch("/api/appointments?as=patient", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const apptData = (await apptRes.json()) as {
      appointments?: AppointmentRow[];
    };
    if (apptRes.ok) setAppointments(apptData.appointments ?? []);
  }

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
      if (rebookId) {
        const response = await fetch(`/api/appointments/${rebookId}`, {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            startsAt: selectedSlot.startsAt,
            endsAt: selectedSlot.endsAt,
          }),
        });
        const data = (await response.json()) as { error?: string };
        if (!response.ok) {
          throw new Error(data.error ?? t("rebookError"));
        }
        setInfo(t("rebookSuccess"));
        success(t("rebookSuccess"));
        setRebookId(null);
        setSelectedSlot(null);
        await reloadAppointments(token);
        return;
      }

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
      success(t("bookSuccess"));
      setSelectedSlot(null);
      await reloadAppointments(token);
    } catch (err) {
      const msg = err instanceof Error ? err.message : t("bookError");
      setError(msg);
      toastError(msg);
    } finally {
      setPending(false);
    }
  }

  async function cancelAppointment(id: string) {
    if (!user) return;
    setActionId(id);
    try {
      const token = await getIdToken(user);
      const res = await fetch(`/api/appointments/${id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: "cancelled" }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? t("cancelError"));
      success(t("cancelSuccess"));
      await reloadAppointments(token);
    } catch (err) {
      toastError(err instanceof Error ? err.message : t("cancelError"));
    } finally {
      setActionId(null);
    }
  }

  function startRebook(a: AppointmentRow) {
    setRebookId(a.id);
    setSpecialistId(a.specialistId);
    setSelectedSlot(null);
    setInfo(t("rebookHint"));
  }

  function startMove(a: AppointmentRow) {
    setRebookId(a.id);
    setSpecialistId(a.specialistId);
    setSelectedSlot(null);
    setInfo(t("rescheduleHint"));
  }

  const specialistName = (id: string) =>
    specialists.find((s) => s.id === id)?.displayName ?? id.slice(0, 8);

  return (
    <div className="space-y-6">
      <form
        onSubmit={(e) => void onSubmit(e)}
        className="space-y-4 rounded-md border border-stone-200 p-4 dark:border-slate-700"
      >
        <h2 className="font-serif text-xl text-teal-800 dark:text-teal-300">
          {rebookId ? t("rebookTitle") : t("title")}
        </h2>
        <p className="text-sm text-stone-600 dark:text-slate-300">
          {rebookId ? t("rebookSubtitle") : t("subtitle")}
        </p>
        <SearchableSelect
          label={t("specialist")}
          placeholder={t("specialistPlaceholder")}
          searchPlaceholder={t("specialistSearch")}
          emptyLabel={t("specialistEmpty")}
          value={specialistId}
          onChange={(id) => {
            if (rebookId) return;
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
            pastLabel={t("pastDay")}
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
        <div className="flex flex-wrap gap-2">
          <Button
            type="submit"
            disabled={pending || !specialistId || !selectedSlot}
          >
            {pending
              ? rebookId
                ? t("rebooking")
                : t("booking")
              : rebookId
                ? t("rebookCta")
                : t("bookCta")}
          </Button>
          {rebookId ? (
            <Button
              type="button"
              variant="secondary"
              disabled={pending}
              onClick={() => {
                setRebookId(null);
                setSelectedSlot(null);
                setInfo(null);
              }}
            >
              {t("rebookAbort")}
            </Button>
          ) : null}
        </div>
      </form>

      <section className="space-y-2">
        <h3 className="font-medium text-stone-800 dark:text-slate-100">
          {t("myAppointments")}
        </h3>
        {activeAppointments.length === 0 ? (
          <p className="text-sm text-stone-600 dark:text-slate-300">
            {t("empty")}
          </p>
        ) : (
          <ul className="space-y-2 text-sm">
            {activeAppointments.map((a) => (
              <li
                key={a.id}
                className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200 py-2 dark:border-slate-700"
              >
                <span>
                  {new Date(a.startsAt).toLocaleString()} ·{" "}
                  {specialistName(a.specialistId)} · {a.status}
                </span>
                <span className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={Boolean(rebookId) || actionId === a.id}
                    onClick={() => startMove(a)}
                  >
                    {t("reschedule")}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={Boolean(rebookId) || actionId === a.id}
                    onClick={() => void cancelAppointment(a.id)}
                  >
                    {actionId === a.id ? t("cancelling") : t("cancel")}
                  </Button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-2">
        <h3 className="font-medium text-stone-800 dark:text-slate-100">
          {t("cancelledTitle")}
        </h3>
        <p className="text-xs text-stone-500 dark:text-slate-400">
          {t("cancelledSubtitle")}
        </p>
        {cancelledAppointments.length === 0 ? (
          <p className="text-sm text-stone-600 dark:text-slate-300">
            {t("cancelledEmpty")}
          </p>
        ) : (
          <ul className="space-y-2 text-sm">
            {cancelledAppointments.map((a) => (
              <li
                key={a.id}
                className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200 py-2 dark:border-slate-700"
              >
                <span>
                  {new Date(a.startsAt).toLocaleString()} ·{" "}
                  {specialistName(a.specialistId)}
                  {a.rescheduledToId ? (
                    <span className="ml-1 text-xs text-teal-700 dark:text-teal-300">
                      ({t("cancelledRebooked")})
                    </span>
                  ) : null}
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={Boolean(rebookId)}
                  onClick={() => startRebook(a)}
                >
                  {t("cancelledRebook")}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
