"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { PanelTabs } from "@/components/molecules/PanelTabs";
import type { CalendarSlot } from "@/components/molecules/WeekCalendar";
import { SpecialistScheduleForm } from "@/components/organisms/SpecialistScheduleForm";
import { GoogleCalendarConnect } from "@/components/organisms/GoogleCalendarConnect";
import { ClinicAgendaTab } from "@/components/organisms/clinic/ClinicAgendaTab";
import { ClinicRegisterPatientTab } from "@/components/organisms/clinic/ClinicRegisterPatientTab";
import { ClinicTransferTab } from "@/components/organisms/clinic/ClinicTransferTab";
import { ClinicFilesTab } from "@/components/organisms/clinic/ClinicFilesTab";
import type {
  ClinicAppointmentRow,
  ClinicPatientOption,
  ClinicPeerOption,
} from "@/components/organisms/clinic/clinicTypes";
import { useAuth } from "@/components/providers/AuthProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { getIdToken } from "@/services/authService";
import {
  DEFAULT_SCHEDULE,
  type ScheduleConfig,
} from "@/lib/availability/defaultSlots";

/**
 * Specialist clinic shell: loads shared data and routes tabs to focused organisms.
 */
export function SpecialistClinicPanel() {
  const t = useTranslations("Clinic");
  const { user } = useAuth();
  const { success, error: toastError } = useToast();

  const [patients, setPatients] = useState<ClinicPatientOption[]>([]);
  const [peers, setPeers] = useState<ClinicPeerOption[]>([]);
  const [appointments, setAppointments] = useState<ClinicAppointmentRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPending, setRegPending] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  const [patientId, setPatientId] = useState("");
  const [selectedSlot, setSelectedSlot] = useState<CalendarSlot | null>(null);
  const [bookPending, setBookPending] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const [transferApptId, setTransferApptId] = useState("");
  const [transferToId, setTransferToId] = useState("");
  const [transferPending, setTransferPending] = useState(false);
  const [schedule, setSchedule] = useState<ScheduleConfig>(DEFAULT_SCHEDULE);
  const [tab, setTab] = useState("agenda");

  const tabs = [
    { id: "agenda", label: t("tabAgenda") },
    { id: "patients", label: t("tabPatients") },
    { id: "schedule", label: t("tabSchedule") },
    { id: "transfer", label: t("tabTransfer") },
    { id: "files", label: t("tabFiles") },
  ];

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void (async () => {
      const token = await getIdToken(user);
      const res = await fetch("/api/specialists/me/schedule", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = (await res.json()) as {
        schedule?: ScheduleConfig & { timezone?: string };
      };
      if (!cancelled && res.ok && data.schedule) {
        setSchedule({
          workdays: data.schedule.workdays,
          ranges: data.schedule.ranges,
          slotMinutes: data.schedule.slotMinutes,
          timezone: data.schedule.timezone,
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, reloadKey]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void (async () => {
      setError(null);
      const token = await getIdToken(user);
      const [patientsRes, apptsRes, peersRes] = await Promise.all([
        fetch("/api/specialists/patients", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/appointments?as=specialist", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/specialists"),
      ]);
      const patientsData = (await patientsRes.json()) as {
        patients?: ClinicPatientOption[];
        error?: string;
      };
      const apptsData = (await apptsRes.json()) as {
        appointments?: ClinicAppointmentRow[];
      };
      const peersData = (await peersRes.json()) as {
        specialists?: ClinicPeerOption[];
      };
      if (cancelled) return;
      if (!patientsRes.ok) {
        setError(patientsData.error ?? t("loadError"));
        return;
      }
      setPatients(patientsData.patients ?? []);
      if (apptsRes.ok) setAppointments(apptsData.appointments ?? []);
      setPeers((peersData.specialists ?? []).filter((s) => s.id !== user.uid));
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
    try {
      const token = await getIdToken(user);
      const response = await fetch("/api/specialists/patients", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: regEmail, displayName: regName }),
      });
      const data = (await response.json()) as {
        error?: string;
        temporaryPassword?: string;
        patient?: ClinicPatientOption;
      };
      if (!response.ok) throw new Error(data.error ?? t("registerError"));
      setTempPassword(data.temporaryPassword ?? null);
      success(t("registerSuccess"));
      setRegName("");
      setRegEmail("");
      setReloadKey((k) => k + 1);
      if (data.patient) setPatientId(data.patient.id);
    } catch (err) {
      const msg = err instanceof Error ? err.message : t("registerError");
      setError(msg);
      toastError(msg);
    } finally {
      setRegPending(false);
    }
  }

  async function bookAppointment(event: React.FormEvent) {
    event.preventDefault();
    if (!user || !selectedSlot) return;
    setBookPending(true);
    setError(null);
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
      if (!response.ok) throw new Error(data.error ?? t("bookError"));
      success(t("bookSuccess"));
      setSelectedSlot(null);
      setReloadKey((k) => k + 1);
    } catch (err) {
      const msg = err instanceof Error ? err.message : t("bookError");
      setError(msg);
      toastError(msg);
    } finally {
      setBookPending(false);
    }
  }

  async function requestTransfer(event: React.FormEvent) {
    event.preventDefault();
    if (!user || !transferApptId || !transferToId) return;
    setTransferPending(true);
    setError(null);
    try {
      const token = await getIdToken(user);
      const res = await fetch(`/api/appointments/${transferApptId}/transfer`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ toSpecialistId: transferToId }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? t("transferError"));
      success(t("transferSent"));
      setTransferApptId("");
      setTransferToId("");
      setReloadKey((k) => k + 1);
    } catch (err) {
      const msg = err instanceof Error ? err.message : t("transferError");
      setError(msg);
      toastError(msg);
    } finally {
      setTransferPending(false);
    }
  }

  return (
    <div className="space-y-4">
      {error ? (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}

      <PanelTabs tabs={tabs} activeId={tab} onChange={setTab}>
        {tab === "agenda" ? (
          <ClinicAgendaTab
            selfUid={user?.uid}
            patients={patients}
            appointments={appointments}
            patientId={patientId}
            onPatientIdChange={setPatientId}
            selectedSlot={selectedSlot}
            onSelectSlot={setSelectedSlot}
            schedule={schedule}
            bookPending={bookPending}
            onSubmit={(e) => void bookAppointment(e)}
          />
        ) : null}

        {tab === "patients" ? (
          <ClinicRegisterPatientTab
            name={regName}
            email={regEmail}
            pending={regPending}
            tempPassword={tempPassword}
            onNameChange={setRegName}
            onEmailChange={setRegEmail}
            onSubmit={(e) => void registerPatient(e)}
          />
        ) : null}

        {tab === "schedule" ? (
          <div className="space-y-8">
            <SpecialistScheduleForm
              onSaved={(next) => {
                setSchedule({
                  workdays: next.workdays,
                  ranges: next.ranges,
                  slotMinutes: next.slotMinutes,
                  timezone: next.timezone,
                });
              }}
            />
            <GoogleCalendarConnect />
          </div>
        ) : null}

        {tab === "transfer" ? (
          <ClinicTransferTab
            patients={patients}
            peers={peers}
            appointments={appointments}
            appointmentId={transferApptId}
            toSpecialistId={transferToId}
            pending={transferPending}
            onAppointmentIdChange={setTransferApptId}
            onToSpecialistIdChange={setTransferToId}
            onSubmit={(e) => void requestTransfer(e)}
          />
        ) : null}

        {tab === "files" ? <ClinicFilesTab patientId={patientId} /> : null}
      </PanelTabs>
    </div>
  );
}
