"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/atoms/Button";
import { useAuth } from "@/components/providers/AuthProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { getIdToken } from "@/services/authService";
import type { TimeRange, Weekday } from "@/types/domain";
import { DEFAULT_SCHEDULE } from "@/lib/availability/defaultSlots";

const DAY_KEYS: { day: Weekday; key: string }[] = [
  { day: 1, key: "mon" },
  { day: 2, key: "tue" },
  { day: 3, key: "wed" },
  { day: 4, key: "thu" },
  { day: 5, key: "fri" },
  { day: 6, key: "sat" },
  { day: 0, key: "sun" },
];

type SpecialistScheduleFormProps = {
  onSaved?: (schedule: { workdays: Weekday[]; ranges: TimeRange[] }) => void;
};

/**
 * Specialist configures workdays + time ranges (e.g. lunch gap).
 */
export function SpecialistScheduleForm({ onSaved }: SpecialistScheduleFormProps) {
  const t = useTranslations("Schedule");
  const { user } = useAuth();
  const { success, error: toastError } = useToast();
  const [workdays, setWorkdays] = useState<Weekday[]>([
    ...DEFAULT_SCHEDULE.workdays,
  ]);
  const [ranges, setRanges] = useState<TimeRange[]>([
    ...DEFAULT_SCHEDULE.ranges,
  ]);
  const [timezone, setTimezone] = useState("Europe/Madrid");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void (async () => {
      try {
        const token = await getIdToken(user);
        const res = await fetch("/api/specialists/me/schedule", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = (await res.json()) as {
          schedule?: {
            workdays: Weekday[];
            ranges: TimeRange[];
            timezone: string;
          };
        };
        if (!cancelled && res.ok && data.schedule) {
          setWorkdays(data.schedule.workdays);
          setRanges(
            data.schedule.ranges.length > 0
              ? data.schedule.ranges
              : [...DEFAULT_SCHEDULE.ranges],
          );
          setTimezone(data.schedule.timezone || "Europe/Madrid");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  function toggleDay(day: Weekday) {
    setWorkdays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort(),
    );
  }

  function updateRange(index: number, field: "start" | "end", value: string) {
    setRanges((prev) =>
      prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)),
    );
  }

  function addRange() {
    setRanges((prev) => [...prev, { start: "09:00", end: "12:00" }]);
  }

  function removeRange(index: number) {
    setRanges((prev) => prev.filter((_, i) => i !== index));
  }

  async function onSave(event: React.FormEvent) {
    event.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      const token = await getIdToken(user);
      const res = await fetch("/api/specialists/me/schedule", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ workdays, ranges, timezone }),
      });
      const data = (await res.json()) as {
        error?: string;
        schedule?: { workdays: Weekday[]; ranges: TimeRange[] };
      };
      if (!res.ok) throw new Error(data.error ?? t("saveError"));
      success(t("saveSuccess"));
      if (data.schedule) onSaved?.(data.schedule);
    } catch (err) {
      toastError(err instanceof Error ? err.message : t("saveError"));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <p className="text-sm text-stone-600 dark:text-slate-300">{t("loading")}</p>
    );
  }

  return (
    <form
      onSubmit={(e) => void onSave(e)}
      className="space-y-4 rounded-md border border-stone-200 p-4 dark:border-slate-700"
    >
      <div>
        <h2 className="font-serif text-xl text-teal-800 dark:text-teal-300">
          {t("title")}
        </h2>
        <p className="mt-1 text-sm text-stone-600 dark:text-slate-300">
          {t("subtitle")}
        </p>
      </div>

      <fieldset>
        <legend className="text-sm font-medium text-stone-800 dark:text-slate-100">
          {t("workdays")}
        </legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {DAY_KEYS.map(({ day, key }) => {
            const active = workdays.includes(day);
            return (
              <button
                key={key}
                type="button"
                aria-pressed={active}
                onClick={() => toggleDay(day)}
                className={
                  active
                    ? "rounded-md bg-teal-700 px-3 py-1.5 text-sm text-white"
                    : "rounded-md border border-stone-300 px-3 py-1.5 text-sm dark:border-slate-600"
                }
              >
                {t(`days.${key}`)}
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-stone-800 dark:text-slate-100">
          {t("ranges")}
        </legend>
        <p className="text-xs text-stone-500 dark:text-slate-400">{t("rangesHint")}</p>
        {ranges.map((range, index) => (
          <div key={index} className="flex flex-wrap items-end gap-2">
            <label className="text-sm">
              <span className="mb-1 block font-medium">{t("from")}</span>
              <input
                type="time"
                value={range.start}
                onChange={(e) => updateRange(index, "start", e.target.value)}
                className="h-10 rounded-md border border-stone-300 px-2 dark:border-slate-600 dark:bg-slate-900"
                required
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium">{t("to")}</span>
              <input
                type="time"
                value={range.end}
                onChange={(e) => updateRange(index, "end", e.target.value)}
                className="h-10 rounded-md border border-stone-300 px-2 dark:border-slate-600 dark:bg-slate-900"
                required
              />
            </label>
            {ranges.length > 1 ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeRange(index)}
              >
                {t("removeRange")}
              </Button>
            ) : null}
          </div>
        ))}
        <Button type="button" variant="secondary" size="sm" onClick={addRange}>
          {t("addRange")}
        </Button>
      </fieldset>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-stone-800 dark:text-slate-100">
          {t("timezone")}
        </span>
        <select
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
          className="h-10 rounded-md border border-stone-300 bg-white px-3 dark:border-slate-600 dark:bg-slate-900"
        >
          <option value="Europe/Madrid">Europe/Madrid</option>
          <option value="Europe/London">Europe/London</option>
          <option value="America/Bogota">America/Bogota</option>
          <option value="America/Mexico_City">America/Mexico_City</option>
          <option value="America/Argentina/Buenos_Aires">
            America/Argentina/Buenos_Aires
          </option>
          <option value="America/New_York">America/New_York</option>
        </select>
      </label>

      <Button type="submit" disabled={saving}>
        {saving ? t("saving") : t("save")}
      </Button>
    </form>
  );
}
