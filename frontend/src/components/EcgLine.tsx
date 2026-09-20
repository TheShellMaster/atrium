import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { useCabinet } from "@/context/Cabinet";
import type { HeartMood } from "@/lib/types";

const BPM: Record<HeartMood, number> = { idle: 62, contract: 96, expand: 44, warn: 128 };

function gauss(x: number, mu: number, sigma: number): number {
  const d = (x - mu) / sigma;
  return Math.exp(-0.5 * d * d);
}

/**
 * Morphologie PQRST d'un cycle cardiaque (phase 0..1, amplitude relative).
 * Onde P (dépolarisation auriculaire), complexe QRS (ventricules), onde T (repolarisation).
 */
export function pqrst(phase: number): number {
  const p = 0.12 * gauss(phase, 0.16, 0.025);
  const q = -0.09 * gauss(phase, 0.275, 0.008);
  const r = 1.0 * gauss(phase, 0.3, 0.011);
  const s = -0.24 * gauss(phase, 0.33, 0.011);
  const t = 0.3 * gauss(phase, 0.56, 0.05);
  return p + q + r + s + t;
}

/**
 * Tracé ECG de moniteur hospitalier : balayage gauche → droite, tête lumineuse,
 * traînée qui s'efface, grille millimétrée. Le rythme suit l'état du cœur.
 */
export function EcgLine({
  className,
  tone,
  seconds = 4,
  grid = true,
}: {
  className?: string;
  tone?: "safe" | "risk" | "muted";
  /** Durée de balayage visible (s). Moniteur standard : 25 mm/s. */
  seconds?: number;
  grid?: boolean;
}) {
  const host = useRef<HTMLCanvasElement>(null);
  const { mood } = useCabinet();
  const moodRef = useRef<HeartMood>(mood);
  const toneRef = useRef(tone);
  moodRef.current = mood;
  toneRef.current = tone;

  useEffect(() => {
    const canvas = host.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let width = 0;
    let height = 0;
    let dpr = 1;
    let samples: Float32Array = new Float32Array(0);
    let head = 0;
    let beatTime = 0;
    let last = performance.now();
    let frame = 0;

    const cssColor = (name: string) => getComputedStyle(canvas).getPropertyValue(name).trim() || "#22c55e";

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = Math.max(1, Math.floor(canvas.clientWidth));
      height = Math.max(1, Math.floor(canvas.clientHeight));
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const fresh = new Float32Array(width);
      fresh.fill(Number.NaN);
      samples = fresh;
      head = 0;
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    const draw = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      const bpm = BPM[moodRef.current];
      const currentTone = toneRef.current;
      const color =
        currentTone === "risk" || moodRef.current === "warn"
          ? cssColor("--color-risk")
          : currentTone === "muted"
            ? cssColor("--color-muted-foreground")
            : cssColor("--color-primary");

      const pxPerSecond = width / seconds;
      const advance = reduced ? 0 : dt * pxPerSecond;
      const from = head;
      head += advance;
      beatTime += dt * (bpm / 60);
      const gap = Math.max(8, width * 0.04);

      // Nouveaux échantillons entre l'ancienne et la nouvelle tête de balayage.
      for (let x = Math.floor(from); x < Math.floor(head); x++) {
        const phase = (beatTime - ((Math.floor(head) - x) / pxPerSecond) * (bpm / 60)) % 1;
        const value = pqrst(phase < 0 ? phase + 1 : phase) + (Math.random() - 0.5) * 0.01;
        samples[x % width] = value;
      }
      if (head >= width) head -= width;
      // Zone effacée devant la tête (comme sur un moniteur).
      for (let g = 1; g <= gap; g++) samples[(Math.floor(head) + g) % width] = Number.NaN;

      ctx.clearRect(0, 0, width, height);

      if (grid) {
        ctx.save();
        ctx.strokeStyle = cssColor("--color-border");
        ctx.globalAlpha = 0.55;
        ctx.lineWidth = 1;
        const step = Math.max(10, height / 4);
        ctx.beginPath();
        for (let x = 0; x <= width; x += step) {
          ctx.moveTo(x + 0.5, 0);
          ctx.lineTo(x + 0.5, height);
        }
        for (let y = 0; y <= height; y += step) {
          ctx.moveTo(0, y + 0.5);
          ctx.lineTo(width, y + 0.5);
        }
        ctx.stroke();
        ctx.restore();
      }

      const baseline = height * 0.68;
      const amplitude = height * 0.55;
      const toY = (v: number) => baseline - v * amplitude;

      if (reduced) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        for (let x = 0; x < width; x++) {
          const phase = ((x / pxPerSecond) * (bpm / 60)) % 1;
          const y = toY(pqrst(phase));
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        return;
      }

      // Tracé : deux passes, halo puis trait net.
      const paths: [number, number][][] = [];
      let current: [number, number][] = [];
      for (let x = 0; x < width; x++) {
        const v = samples[x];
        if (Number.isNaN(v)) {
          if (current.length > 1) paths.push(current);
          current = [];
          continue;
        }
        current.push([x, toY(v)]);
      }
      if (current.length > 1) paths.push(current);

      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      for (const pass of [
        { width: 5, alpha: 0.18 },
        { width: 1.7, alpha: 0.95 },
      ]) {
        ctx.strokeStyle = color;
        ctx.globalAlpha = pass.alpha;
        ctx.lineWidth = pass.width;
        for (const path of paths) {
          ctx.beginPath();
          ctx.moveTo(path[0][0], path[0][1]);
          for (let i = 1; i < path.length; i++) ctx.lineTo(path[i][0], path[i][1]);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;

      // Tête lumineuse du balayage.
      const hx = Math.floor(head) % width;
      const hv = samples[(hx - 1 + width) % width];
      if (!Number.isNaN(hv)) {
        const hy = toY(hv);
        const glow = ctx.createRadialGradient(hx, hy, 0, hx, hy, 9);
        glow.addColorStop(0, color);
        glow.addColorStop(1, "transparent");
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(hx, hy, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.globalAlpha = 0.9;
        ctx.beginPath();
        ctx.arc(hx, hy, 1.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [seconds, grid]);

  return (
    <canvas
      ref={host}
      className={cn("block h-12 w-full", className)}
      role="img"
      aria-label="Tracé électrocardiographique animé"
    />
  );
}
