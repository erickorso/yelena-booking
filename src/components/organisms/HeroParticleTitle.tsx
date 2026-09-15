"use client";

import { useEffect, useRef } from "react";

type Particle = {
  x: number;
  y: number;
  tx: number;
  ty: number;
  vx: number;
  vy: number;
  r: number;
  c: string;
  delay: number;
};

type Props = {
  text: string;
  className?: string;
  density?: number;
  formMs?: number;
};

const COLORS = ["#134e4a", "#0f766e", "#0d9488", "#115e59", "#0f766e"];
const POINTER_RADIUS = 120;
const POINTER_FORCE = 7;

function easeOutCubic(t: number) {
  return 1 - (1 - t) ** 3;
}

function fillWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  align: CanvasTextAlign = "left",
) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);

  ctx.textAlign = align;
  const startY = y - ((lines.length - 1) * lineHeight) / 2;
  lines.forEach((l, i) => {
    ctx.fillText(l, x, startY + i * lineHeight);
  });
}

function sampleTextPoints(
  text: string,
  width: number,
  height: number,
  step: number,
): { x: number; y: number }[] {
  const off = document.createElement("canvas");
  off.width = width;
  off.height = height;
  const octx = off.getContext("2d", { willReadFrequently: true });
  if (!octx) return [];

  octx.clearRect(0, 0, width, height);
  octx.fillStyle = "#fff";
  octx.textBaseline = "middle";
  const fontSize = Math.min(width * 0.28, height * 0.62, 118);
  octx.font = `700 ${fontSize}px Georgia, "Times New Roman", serif`;
  fillWrappedText(octx, text, 8, height / 2, width - 16, fontSize * 1.12, "left");

  const { data } = octx.getImageData(0, 0, width, height);
  const pts: { x: number; y: number }[] = [];
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const a = data[(y * width + x) * 4 + 3] ?? 0;
      if (a > 140) pts.push({ x, y });
    }
  }
  return pts;
}

/** Título formado por partículas (estilo Altair), paleta teal Yelena. */
export function HeroParticleTitle({ text, className, density = 700, formMs = 1800 }: Props) {
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

    let raf = 0;
    let running = true;
    let particles: Particle[] = [];
    let visible = true;
    let pointerActive = false;
    let pointerX = 0;
    let pointerY = 0;
    let formStartedAt = performance.now();

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const isMobile = window.matchMedia("(max-width: 640px)").matches;
    const maxN = Math.floor(density * (isMobile ? 0.45 : 1));
    const step = isMobile ? 4 : 2;
    const radius = isMobile ? 90 : POINTER_RADIUS;

    function paintReduced() {
      const w = wrap.clientWidth;
      const h = wrap.clientHeight;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "#134e4a";
      ctx.textBaseline = "middle";
      const fontSize = Math.min(w * 0.28, h * 0.62, 118);
      ctx.font = `700 ${fontSize}px Georgia, "Times New Roman", serif`;
      fillWrappedText(ctx, text, 8, h / 2, w - 16, fontSize * 1.12, "left");
    }

    function resize() {
      const w = wrap.clientWidth;
      const h = wrap.clientHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      if (reduce) {
        paintReduced();
        return;
      }

      const targets = sampleTextPoints(text, w, h, step);
      if (!targets.length) return;

      const pool =
        targets.length > maxN
          ? targets.filter((_, i) => i % Math.ceil(targets.length / maxN) === 0).slice(0, maxN)
          : targets;

      particles = pool.map((t, i) => {
        const angle = Math.random() * Math.PI * 2;
        const dist = 60 + Math.random() * Math.max(w, h) * 0.5;
        return {
          x: w / 2 + Math.cos(angle) * dist,
          y: h / 2 + Math.sin(angle) * dist,
          tx: t.x,
          ty: t.y,
          vx: (Math.random() - 0.5) * 3,
          vy: (Math.random() - 0.5) * 3,
          r: 0.55 + Math.random() * 1.1,
          c: COLORS[i % COLORS.length]!,
          delay: Math.random() * 0.3,
        };
      });
      formStartedAt = performance.now();
    }

    function syncPointer(clientX: number, clientY: number) {
      const rect = wrap.getBoundingClientRect();
      pointerX = clientX - rect.left;
      pointerY = clientY - rect.top;
      pointerActive =
        pointerX >= -40 &&
        pointerY >= -40 &&
        pointerX <= rect.width + 40 &&
        pointerY <= rect.height + 40;
    }

    function onPointerMove(e: PointerEvent) {
      syncPointer(e.clientX, e.clientY);
    }

    function onPointerLeave() {
      pointerActive = false;
    }

    function tick(now: number) {
      if (!running) return;
      const w = wrap.clientWidth;
      const h = wrap.clientHeight;
      ctx.clearRect(0, 0, w, h);

      if (reduce) {
        paintReduced();
        return;
      }

      if (!visible) {
        raf = requestAnimationFrame(tick);
        return;
      }

      const elapsed = now - formStartedAt;
      const formT = easeOutCubic(Math.min(1, elapsed / formMs));
      const r2 = radius * radius;

      for (const p of particles) {
        const localT = easeOutCubic(
          Math.min(1, Math.max(0, (elapsed / formMs - p.delay) / (1 - p.delay * 0.5))),
        );
        const pull = 0.012 + localT * 0.045 * formT;
        p.vx += (p.tx - p.x) * pull;
        p.vy += (p.ty - p.y) * pull;

        if (pointerActive) {
          const px = p.x - pointerX;
          const py = p.y - pointerY;
          const d2 = px * px + py * py;
          if (d2 < r2 && d2 > 0.01) {
            const dist = Math.sqrt(d2);
            const force = ((radius - dist) / radius) * POINTER_FORCE * (0.35 + formT * 0.65);
            p.vx += (px / dist) * force;
            p.vy += (py / dist) * force;
          }
        }

        p.vx *= 0.86;
        p.vy *= 0.86;
        p.x += p.vx;
        p.y += p.vy;

        ctx.beginPath();
        ctx.fillStyle = p.c;
        ctx.globalAlpha = 0.72 + localT * 0.28;
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(tick);
    }

    resize();
    if (!reduce) {
      raf = requestAnimationFrame(tick);
      wrap.addEventListener("pointermove", onPointerMove, { passive: true });
      wrap.addEventListener("pointerleave", onPointerLeave);
      window.addEventListener("pointermove", onPointerMove, { passive: true });
    }

    const ro = new ResizeObserver(() => {
      resize();
      if (reduce) paintReduced();
    });
    ro.observe(wrap);

    const io = new IntersectionObserver(
      ([e]) => {
        visible = e?.isIntersecting ?? true;
      },
      { threshold: 0.05 },
    );
    io.observe(wrap);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      wrap.removeEventListener("pointermove", onPointerMove);
      wrap.removeEventListener("pointerleave", onPointerLeave);
      window.removeEventListener("pointermove", onPointerMove);
    };
  }, [text, density, formMs]);

  return (
    <div ref={wrapRef} className={`relative min-h-[12rem] touch-none ${className ?? ""}`}>
      <canvas
        ref={canvasRef}
        className="h-full w-full cursor-crosshair touch-none"
        aria-hidden
      />
      <h1 className="sr-only">{text}</h1>
    </div>
  );
}
