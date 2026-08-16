"use client";

import { Suspense, type ReactNode } from "react";
import { PanelSkeleton } from "@/components/atoms/Skeleton";

type AsyncBoundaryProps = {
  children: ReactNode;
  fallback?: ReactNode;
};

/**
 * Suspense shell for lazy / async UI trees. Default fallback: panel skeleton.
 */
export function AsyncBoundary({
  children,
  fallback,
}: AsyncBoundaryProps) {
  return (
    <Suspense fallback={fallback ?? <PanelSkeleton />}>{children}</Suspense>
  );
}
