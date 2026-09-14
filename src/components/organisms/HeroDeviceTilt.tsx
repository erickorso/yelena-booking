"use client";

import { useCallback, useRef, type ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
  /** Intensidad del tilt (grados máx). */
  maxTilt?: number;
};

/**
 * Tilt 3D suave al mover el pointer (desktop).
 * Respeta prefers-reduced-motion.
 */
export function HeroDeviceTilt({ children, className, maxTilt = 10 }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  const reset = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.transform = "perspective(900px) rotateX(0deg) rotateY(0deg) scale(1)";
  }, []);

  const onMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const el = ref.current;
      if (!el) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      if (window.matchMedia("(pointer: coarse)").matches) return;

      const rect = el.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      const rotY = (x - 0.5) * maxTilt * 2;
      const rotX = (0.5 - y) * maxTilt * 2;
      el.style.transform = `perspective(900px) rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg) scale(1.03)`;
    },
    [maxTilt],
  );

  return (
    <div
      ref={ref}
      className={`hero-device-tilt will-change-transform ${className ?? ""}`}
      onPointerMove={onMove}
      onPointerLeave={reset}
      onPointerCancel={reset}
    >
      {children}
    </div>
  );
}
