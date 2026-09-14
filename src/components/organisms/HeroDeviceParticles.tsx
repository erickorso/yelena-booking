"use client";

import { useEffect, useRef } from "react";

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  a: number;
};

type Props = {
  className?: string;
  count?: number;
  /** RGB sin alpha, p.ej. "15,118,110" */
  color?: string;
};

/** Partículas ambient detrás de laptop/tablet. */
export function HeroDeviceParticles({
  className,
  count = 56,
  color = "15,118,110",
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvasNode = canvasRef.current;
    const wrapNode = wrapRef.current;
    if (!canvasNode || !wrapNode) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const drawCtx = canvasNode.getContext("2d");
    if (!drawCtx) return;

    const canvas = canvasNode;
    const wrap = wrapNode;
    const ctx = drawCtx;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const isMobile = window.matchMedia("(max-width: 640px)").matches;
    const n = Math.floor(count * (isMobile ? 0.5 : 1));

    let particles: Particle[] = [];
    let raf = 0;
    let running = true;
    let w = 0;
    let h = 0;

    function spawn() {
      particles = Array.from({ length: n }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        r: 0.7 + Math.random() * 2,
        a: 0.2 + Math.random() * 0.45,
      }));
    }

    function paintStatic() {
      ctx.clearRect(0, 0, w, h);
      for (const p of particles) {
        ctx.beginPath();
        ctx.fillStyle = `rgba(${color},${p.a * 0.75})`;
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function resize() {
      w = wrap.clientWidth;
      h = wrap.clientHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      spawn();
      if (reduce) paintStatic();
    }

    function tick() {
      if (!running) return;
      ctx.clearRect(0, 0, w, h);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < -4) p.x = w + 4;
        if (p.x > w + 4) p.x = -4;
        if (p.y < -4) p.y = h + 4;
        if (p.y > h + 4) p.y = -4;
        const pulse = 0.85 + Math.sin(performance.now() * 0.002 + p.x) * 0.15;
        ctx.beginPath();
        ctx.fillStyle = `rgba(${color},${p.a * pulse})`;
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(tick);
    }

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);
    if (!reduce) raf = requestAnimationFrame(tick);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [color, count]);

  return (
    <div ref={wrapRef} className={className} aria-hidden>
      <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" />
    </div>
  );
}
