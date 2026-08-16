"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { clsx } from "clsx";
import { useAuth } from "@/components/providers/AuthProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { getIdToken } from "@/services/authService";

/**
 * Optional circular profile photo in dashboard header (patient + specialist).
 */
export function ProfilePhotoControl() {
  const t = useTranslations("ProfilePhoto");
  const { user } = useAuth();
  const { success, error: toastError } = useToast();
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void (async () => {
      try {
        const token = await getIdToken(user);
        const res = await fetch("/api/me/photo", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = (await res.json()) as {
          photoUrl?: string | null;
          displayName?: string | null;
        };
        if (cancelled || !res.ok) return;
        setPhotoUrl(data.photoUrl ?? user.photoURL ?? null);
        setDisplayName(data.displayName ?? user.displayName ?? "");
      } catch {
        if (!cancelled) {
          setPhotoUrl(user.photoURL);
          setDisplayName(user.displayName ?? "");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const initials = (displayName || user?.email || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("") || "?";

  async function upload(file: File) {
    if (!user) return;
    setBusy(true);
    try {
      const token = await getIdToken(user);
      const body = new FormData();
      body.set("file", file);
      const res = await fetch("/api/me/photo", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body,
      });
      const data = (await res.json()) as {
        photoUrl?: string | null;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? t("uploadError"));
      setPhotoUrl(data.photoUrl ?? null);
      success(t("uploadSuccess"));
    } catch (err) {
      toastError(err instanceof Error ? err.message : t("uploadError"));
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function removePhoto() {
    if (!user) return;
    setBusy(true);
    try {
      const token = await getIdToken(user);
      const res = await fetch("/api/me/photo", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? t("removeError"));
      setPhotoUrl(null);
      success(t("removeSuccess"));
    } catch (err) {
      toastError(err instanceof Error ? err.message : t("removeError"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-1.5">
      <label
        htmlFor={inputId}
        className={clsx(
          "relative block h-16 w-16 cursor-pointer overflow-hidden rounded-full",
          "border-2 border-teal-700/40 bg-stone-100 dark:border-teal-400/40 dark:bg-slate-800",
          busy && "opacity-60",
        )}
        title={t("hint")}
      >
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- remote blob / Google URL
          <img
            src={photoUrl}
            alt={t("alt")}
            className="h-full w-full object-cover"
          />
        ) : (
          <span
            aria-hidden
            className="flex h-full w-full items-center justify-center text-lg font-semibold text-teal-800 dark:text-teal-300"
          >
            {initials}
          </span>
        )}
        <span className="sr-only">{t("change")}</span>
      </label>
      <input
        id={inputId}
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        disabled={busy}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void upload(file);
        }}
      />
      <div className="flex flex-wrap justify-center gap-2 text-xs">
        <button
          type="button"
          className="text-teal-800 underline dark:text-teal-300"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          {photoUrl ? t("change") : t("add")}
        </button>
        {photoUrl ? (
          <button
            type="button"
            className="text-stone-500 underline dark:text-slate-400"
            disabled={busy}
            onClick={() => void removePhoto()}
          >
            {t("remove")}
          </button>
        ) : null}
      </div>
    </div>
  );
}
