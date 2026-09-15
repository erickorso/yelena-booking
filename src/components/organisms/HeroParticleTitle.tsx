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

type TextLayout = {
  fontSize: number;
  lineHeight: number;
  lines: string[];
  startX: number;
  startY: number;
};

const COLORS = ["#134e4a", "#0f766e", "#0d9488", "#115e59", "#0f766e"];
const POINTER_RADIUS = 120;
const POINTER_FORCE = 7;
const PAD = 12;

function easeOutCubic(t: number) {
  return 1 - (1 - t) ** 3;
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.replace(/\.$/, "").split(/\s+/).filter(Boolean);
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
  // restore period on last line if original had it
  if (text.trim().endsWith(".") && lines.length) {
    const last = lines[lines.length - 1]!;
    if (!last.endsWith(".")) lines[lines.length - 1] = `${last}.`;
  }
  return lines.length ? lines : [text];
}

/** Escala la fuente hasta que el bloque entero quepa en el canvas (con padding). */
function fitTextLayout(
  ctx: CanvasRenderingContext2D,
  text: string,
  width: number,
  height: number,
): TextLayout {
  const maxW = Math.max(40, width - PAD * 2);
  const maxH = Math.max(40, height - PAD * 2);
  let fontSize = Math.min(maxW * 0.22, maxH * 0.28, 72);

  for (; fontSize >= 16; fontSize -= 1) {
    ctx.font = `700 ${fontSize}px Georgia, "Times New Roman", serif`;
    const lineHeight = fontSize * 1.18;
    const lines = wrapLines(ctx, text, maxW);
    const blockH = lines.length * lineHeight;
    const blockW = Math.max(...lines.map((l) => ctx.measureText(l).width), 0);
    if (blockH <= maxH && blockW <= maxW) {
      return {
        fontSize,
        lineHeight,
        lines,
        startX: PAD,
        startY: PAD + (maxH - blockH) / 2 + fontSize * 0.85,
      };
    }
  }

  ctx.font = `700 16px Georgia, "Times New Roman", serif`;
  const lineHeight = 16 * 1.18;
  const lines = wrapLines(ctx, text, maxW);
  return {
    fontSize: 16,
    lineHeight,
    lines,
    startX: PAD,
    startY: PAD + 16 * 0.85,
  };
}

function paintFittedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  width: number,
  height: number,
  fillStyle: string,
) {
  const layout = fitTextLayout(ctx, text, width, height);
  ctx.fillStyle = fillStyle;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.font = `700 ${layout.fontSize}px Georgia, "Times New Roman", serif`;
  layout.lines.forEach((line, i) => {
    ctx.fillText(line, layout.startX, layout.startY + i * layout.lineHeight);
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
  paintFittedText(octx, text, width, height, "#fff");

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
    const maxN = Math.floor(density * (isMobile ? 0.55 : 1));
    const step = isMobile ? 2 : 1;
    const radius = isMobile ? 90 : POINTER_RADIUS;

    function paintReduced() {
      const w = wrap.clientWidth;
      const h = wrap.clientHeight;
      ctx.clearRect(0, 0, w, h);
      paintFittedText(ctx, text, w, h, "#134e4a");
    }

    function resize() {
      const w = wrap.clientWidth;
      const h = wrap.clientHeight;
      if (w < 8 || h < 8) return;

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
        const dist = 40 + Math.random() * Math.max(w, h) * 0.4;
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
    <div ref={wrapRef} className={`relative h-full min-h-[10rem] w-full touch-none ${className ?? ""}`}>
      <canvas
        ref={canvasRef}
        className="h-full w-full cursor-crosshair touch-none"
        aria-hidden
      />
      <h1 className="sr-only">{text}</h1>
    </div>
  );
}
