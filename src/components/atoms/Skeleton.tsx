import { clsx } from "clsx";

type SkeletonProps = {
  className?: string;
};

/** Single pulse bar for loading placeholders. */
export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      aria-hidden
      className={clsx(
        "animate-pulse rounded-md bg-stone-200 dark:bg-slate-700",
        className,
      )}
    />
  );
}

type SkeletonBlockProps = {
  className?: string;
  lines?: number;
};

/** Stack of lines for text/list loading. */
export function SkeletonLines({ className, lines = 4 }: SkeletonBlockProps) {
  return (
    <div
      className={clsx("space-y-2", className)}
      role="status"
      aria-busy="true"
      aria-label="Loading"
    >
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton
          key={i}
          className={clsx("h-3", i === lines - 1 ? "w-[66%]" : "w-full")}
        />
      ))}
    </div>
  );
}

/** Form-like grid placeholder. */
export function FormSkeleton({ className }: SkeletonProps) {
  return (
    <div
      className={clsx("space-y-4", className)}
      role="status"
      aria-busy="true"
      aria-label="Loading"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
    </div>
  );
}

/** Card list placeholder. */
export function ListSkeleton({
  className,
  rows = 3,
}: SkeletonProps & { rows?: number }) {
  return (
    <div
      className={clsx("space-y-3", className)}
      role="status"
      aria-busy="true"
      aria-label="Loading"
    >
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-md border border-stone-200 p-3 dark:border-slate-700"
        >
          <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-3 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Compact page / panel placeholder. */
export function PanelSkeleton({ className }: SkeletonProps) {
  return (
    <div
      className={clsx("space-y-3 rounded-md border border-stone-200 p-4 dark:border-slate-700", className)}
      role="status"
      aria-busy="true"
      aria-label="Loading"
    >
      <Skeleton className="h-6 w-40" />
      <Skeleton className="h-3 w-[66%]" />
      <FormSkeleton />
    </div>
  );
}
