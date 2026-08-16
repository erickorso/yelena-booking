"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { SearchableSelect } from "@/components/molecules/SearchableSelect";
import { useAuth } from "@/components/providers/AuthProvider";
import { getIdToken } from "@/services/authService";
import { normalizeSpecialty } from "@/lib/specialties/catalog";

type SpecialtyPickerProps = {
  value: string;
  onChange: (specialty: string) => void;
  required?: boolean;
  name?: string;
};

/**
 * Specialty catalog combobox; signed-in users can add a missing profession.
 */
export function SpecialtyPicker({
  value,
  onChange,
  required,
  name,
}: SpecialtyPickerProps) {
  const t = useTranslations("Specialty");
  const { user } = useAuth();
  const [names, setNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/specialties");
        const data = (await res.json()) as {
          specialties?: { name: string }[];
        };
        if (!cancelled && res.ok) {
          setNames((data.specialties ?? []).map((s) => s.name));
        }
      } catch {
        if (!cancelled) setNames([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const options = useMemo(() => {
    const list = [...names];
    if (
      value &&
      !list.some((n) => normalizeSpecialty(n) === normalizeSpecialty(value))
    ) {
      list.push(value);
    }
    return list.map((n) => ({ id: n, label: n, searchText: n }));
  }, [names, value]);

  const getCreateOptionLabel = useCallback(
    (query: string) => {
      if (!query.trim()) return null;
      const n = normalizeSpecialty(query);
      if (names.some((name) => normalizeSpecialty(name) === n)) return null;
      return t("create", { name: query.trim() });
    },
    [names, t],
  );

  async function createSpecialty(raw: string) {
    const trimmed = raw.trim();
    if (!trimmed) return;
    setCreating(true);
    setError(null);
    try {
      if (user) {
        const token = await getIdToken(user);
        const res = await fetch("/api/specialties", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ name: trimmed }),
        });
        const data = (await res.json()) as {
          error?: string;
          specialty?: { name: string };
        };
        if (!res.ok || !data.specialty) {
          throw new Error(data.error ?? t("createError"));
        }
        const created = data.specialty.name;
        setNames((prev) =>
          prev.some((n) => normalizeSpecialty(n) === normalizeSpecialty(created))
            ? prev
            : [...prev, created].sort((a, b) =>
                a.localeCompare(b, "es", { sensitivity: "base" }),
              ),
        );
        onChange(created);
        return;
      }
      // Pre-auth register: local select; server will ensure on bootstrap.
      setNames((prev) =>
        prev.some((n) => normalizeSpecialty(n) === normalizeSpecialty(trimmed))
          ? prev
          : [...prev, trimmed].sort((a, b) =>
              a.localeCompare(b, "es", { sensitivity: "base" }),
            ),
      );
      onChange(trimmed);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("createError"));
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-1.5">
      <SearchableSelect
        label={t("label")}
        placeholder={loading ? t("loading") : t("placeholder")}
        searchPlaceholder={t("search")}
        emptyLabel={t("empty")}
        options={options}
        value={value}
        onChange={onChange}
        required={required}
        name={name}
        getCreateOptionLabel={getCreateOptionLabel}
        onCreateOption={(q) => void createSpecialty(q)}
        createPending={creating}
      />
      {error ? (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}
      <p className="text-xs text-stone-500 dark:text-slate-400">{t("hint")}</p>
    </div>
  );
}
