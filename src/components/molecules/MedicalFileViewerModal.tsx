"use client";

import { useEffect, useId, useRef } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/atoms/Button";

export type MedicalFilePreviewKind = "image" | "pdf";

type MedicalFileViewerModalProps = {
  open: boolean;
  title: string;
  kind: MedicalFilePreviewKind;
  objectUrl: string | null;
  onClose: () => void;
  onDownload: () => void;
};

/**
 * In-app preview for medical images and PDFs (object URL from auth proxy).
 */
export function MedicalFileViewerModal({
  open,
  title,
  kind,
  objectUrl,
  onClose,
  onDownload,
}: MedicalFileViewerModalProps) {
  const t = useTranslations("MedicalFiles");
  const titleId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  if (!open || !objectUrl) return null;

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      className="fixed left-1/2 top-1/2 z-50 m-0 flex h-[min(92vh,56rem)] w-[min(100%,56rem)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-md border border-stone-200 bg-white p-0 text-stone-900 shadow-lg backdrop:bg-stone-950/50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-stone-200 px-4 py-3 dark:border-slate-700">
        <h2
          id={titleId}
          className="truncate font-serif text-lg text-teal-800 dark:text-teal-300"
        >
          {title}
        </h2>
        <div className="flex shrink-0 gap-2">
          <Button type="button" size="sm" variant="secondary" onClick={onDownload}>
            {t("download")}
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={onClose}>
            {t("closePreview")}
          </Button>
        </div>
      </div>
      <div className="min-h-0 flex-1 bg-stone-100 dark:bg-slate-950">
        {kind === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element -- ephemeral object URL
          <img
            src={objectUrl}
            alt={title}
            className="mx-auto h-full max-h-full w-full object-contain p-2"
          />
        ) : (
          <iframe
            title={title}
            src={objectUrl}
            className="h-full w-full border-0 bg-white"
          />
        )}
      </div>
    </dialog>
  );
}

export function medicalFilePreviewKind(
  contentType: string,
  fileName: string,
): MedicalFilePreviewKind | null {
  const ct = contentType.toLowerCase();
  const name = fileName.toLowerCase();
  if (ct.startsWith("image/") || /\.(png|jpe?g|webp|gif)$/.test(name)) {
    return "image";
  }
  if (ct === "application/pdf" || name.endsWith(".pdf")) {
    return "pdf";
  }
  return null;
}
