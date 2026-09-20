import { useId, useMemo } from "react";
import { useCabinet } from "@/context/Cabinet";
import type { HeartMood } from "@/lib/types";
import { cn } from "@/lib/utils";

type Vessel = {
  d: string;
  kind: "artery" | "vein";
  width: number;
  cells: number;
  duration: number;
};

const W = 1000;
const H = 600;

/** Générateur pseudo-aléatoire déterministe (même réseau à chaque rendu). */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

function polar(r: number, a: number, cx: number, cy: number): [number, number] {
  return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
}

function cubic(p0: number[], p1: number[], p2: number[], p3: number[], t: number): [number, number] {
  const u = 1 - t;
  return [
    u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
    u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
  ];
}

/** Réseau de vaisseaux : troncs qui partent du cœur vers les bords, puis ramifications. */
function buildNetwork(seed: number, trunks: number, cx: number, cy: number, reach: number): Vessel[] {
  const rand = rng(seed);
  const vessels: Vessel[] = [];

  const path = (pts: number[][]) =>
    `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)} C ${pts[1][0].toFixed(1)} ${pts[1][1].toFixed(1)}, ${pts[2][0].toFixed(1)} ${pts[2][1].toFixed(1)}, ${pts[3][0].toFixed(1)} ${pts[3][1].toFixed(1)}`;

  for (let i = 0; i < trunks; i++) {
    const a = (i / trunks) * Math.PI * 2 + (rand() - 0.5) * 0.5;
    const kind: Vessel["kind"] = i % 2 === 0 ? "artery" : "vein";
    const bend = (rand() - 0.5) * 2.2;
    const p0 = polar((105 + rand() * 25) * reach, a, cx, cy);
    const p1 = polar((190 + rand() * 60) * reach, a + bend * 0.35, cx, cy);
    const p2 = polar((330 + rand() * 90) * reach, a + bend * 0.85, cx, cy);
    const p3 = polar((640 + rand() * 80) * reach, a + bend * 0.55, cx, cy);
    const trunk = [p0, p1, p2, p3];
    vessels.push({ d: path(trunk), kind, width: 3.2 + rand() * 1.8, cells: 5, duration: 7 + rand() * 3 });

    const branches = 2 + Math.floor(rand() * 2);
    for (let b = 0; b < branches; b++) {
      const t = 0.22 + rand() * 0.5;
      const start = cubic(p0, p1, p2, p3, t);
      const side = rand() > 0.5 ? 1 : -1;
      const ba = a + bend * t + side * (0.6 + rand() * 0.6);
      const len = 180 + rand() * 200;
      const curl = side * (0.35 + rand() * 0.5);
      const branch = [
        start,
        polar(len * 0.35, ba, start[0], start[1]),
        polar(len * 0.7, ba + curl * 0.6, start[0], start[1]),
        polar(len, ba + curl, start[0], start[1]),
      ];
      vessels.push({ d: path(branch), kind, width: 1.5 + rand() * 1.1, cells: 3, duration: 5 + rand() * 3 });

      const twigs = 1 + Math.floor(rand() * 2);
      for (let k = 0; k < twigs; k++) {
        const t2 = 0.35 + rand() * 0.5;
        const s2 = cubic(branch[0], branch[1], branch[2], branch[3], t2);
        const ca = ba + curl * t2 + (rand() > 0.5 ? 0.8 : -0.8) * (0.7 + rand() * 0.5);
        const l2 = 70 + rand() * 110;
        const twig = [
          s2,
          polar(l2 * 0.4, ca, s2[0], s2[1]),
          polar(l2 * 0.75, ca + 0.25, s2[0], s2[1]),
          polar(l2, ca + 0.45, s2[0], s2[1]),
        ];
        vessels.push({ d: path(twig), kind, width: 0.7 + rand() * 0.6, cells: 2, duration: 4 + rand() * 2 });
      }
    }
  }
  return vessels;
}

const SPEED: Record<HeartMood, number> = { idle: 1, contract: 1.7, expand: 0.65, warn: 2.4 };
const BPM: Record<HeartMood, number> = { idle: 62, contract: 96, expand: 44, warn: 128 };

const smooth = (t: number) => {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
};

/** Lobe pulmonaire stylisé centré en (x, y), miroir pour le côté droit. */
function lungLobe(x: number, y: number, mirror: boolean): string {
  const m = mirror ? -1 : 1;
  const p = (dx: number, dy: number) => `${(x + dx * m).toFixed(1)} ${(y + dy).toFixed(1)}`;
  return [
    `M ${p(20, -95)}`,
    `C ${p(-40, -100)}, ${p(-95, -40)}, ${p(-92, 30)}`,
    `C ${p(-90, 80)}, ${p(-55, 105)}, ${p(-5, 98)}`,
    `C ${p(30, 92)}, ${p(38, 60)}, ${p(34, 20)}`,
    `C ${p(30, -20)}, ${p(28, -60)}, ${p(20, -95)} Z`,
  ].join(" ");
}

/** Vaisseaux qui descendent du cœur vers les deux poumons (artères et veines pulmonaires). */
function descent(cx: number, cy: number, reach: number): { vessels: Vessel[]; lungs: { left: string; right: string; y: number } } {
  const rand = rng(31);
  const ly = cy + 210 * reach;
  const lobes = [cx - 185 * reach, cx + 185 * reach];
  const vessels: Vessel[] = [];
  lobes.forEach((lx, side) => {
    const dir = side === 0 ? -1 : 1;
    for (let k = 0; k < 3; k++) {
      const kind: Vessel["kind"] = k === 1 ? "vein" : "artery";
      const start: [number, number] = [cx + dir * (18 + k * 14) * reach, cy + (62 + k * 10) * reach];
      const end: [number, number] = [lx + dir * (k - 1) * 28 * reach + (rand() - 0.5) * 20, ly + (k - 1) * 30 * reach + (rand() - 0.5) * 24];
      const c1: [number, number] = [start[0] + dir * 30 * reach, start[1] + 70 * reach];
      const c2: [number, number] = [end[0] - dir * 60 * reach, end[1] - 90 * reach];
      const d = `M ${start[0].toFixed(1)} ${start[1].toFixed(1)} C ${c1[0].toFixed(1)} ${c1[1].toFixed(1)}, ${c2[0].toFixed(1)} ${c2[1].toFixed(1)}, ${end[0].toFixed(1)} ${end[1].toFixed(1)}`;
      vessels.push({ d, kind, width: 2.2 + (k === 1 ? 1.2 : 0.6), cells: 4, duration: 6 + rand() * 2 });
    }
  });
  return { vessels, lungs: { left: lungLobe(lobes[0], ly, false), right: lungLobe(lobes[1], ly, true), y: ly } };
}

/**
 * Arrière-plan vasculaire : artères (rouge) et veines (violet) qui partent du cœur,
 * globules qui circulent le long des vaisseaux (offset-path), pulsation au rythme cardiaque.
 */
export function VesselBackground({
  className,
  seed = 7,
  trunks = 8,
  intensity = 1,
  center = [0.5, 0.5],
  reach = 1,
  grow,
}: {
  className?: string;
  seed?: number;
  trunks?: number;
  intensity?: number;
  /** Position du cœur dans le cadre (fractions 0..1). */
  center?: [number, number];
  /** Étirement du réseau (1 = cadre 1000×600). */
  reach?: number;
  /** Progression du défilement : les vaisseaux descendent vers les poumons (0..1). */
  grow?: number;
}) {
  const { mood } = useCabinet();
  const uid = useId().replace(/:/g, "");
  const CX = W * center[0];
  const CY = H * center[1];
  const vessels = useMemo(() => buildNetwork(seed, trunks, CX, CY, reach), [seed, trunks, CX, CY, reach]);
  const down = useMemo(() => (grow === undefined ? null : descent(CX, CY, reach)), [grow === undefined, CX, CY, reach]);
  const g = smooth(grow ?? 0);
  const lungsOpacity = smooth(((grow ?? 0) - 0.3) / 0.5);

  return (
    <div
      className={cn("pointer-events-none overflow-hidden", className)}
      style={
        {
          "--flow-speed": SPEED[mood],
          "--beat": `${(60 / BPM[mood]).toFixed(3)}s`,
          opacity: intensity,
        } as React.CSSProperties
      }
      aria-hidden="true"
    >
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" className="size-full">
        <defs>
          <filter id={`glow-${uid}`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" />
          </filter>
          <radialGradient id={`heartglow-${uid}`}>
            <stop offset="0%" stopColor="var(--color-risk)" stopOpacity="0.35" />
            <stop offset="60%" stopColor="var(--color-risk)" stopOpacity="0.06" />
            <stop offset="100%" stopColor="var(--color-risk)" stopOpacity="0" />
          </radialGradient>
        </defs>

        <circle
          cx={CX}
          cy={CY}
          r={260 * reach}
          fill={`url(#heartglow-${uid})`}
          style={{ animation: "vessel-pulse var(--beat) ease-in-out infinite" }}
        />

        <g filter={`url(#glow-${uid})`} opacity="0.32">
          {vessels.map((v, i) => (
            <path
              key={`g${i}`}
              d={v.d}
              fill="none"
              stroke={v.kind === "artery" ? "var(--color-risk)" : "var(--color-chart-5)"}
              strokeWidth={v.width * 2.4}
              strokeLinecap="round"
            />
          ))}
        </g>

        <g style={{ animation: "vessel-pulse var(--beat) ease-in-out infinite" }}>
          {vessels.map((v, i) => (
            <path
              key={`v${i}`}
              d={v.d}
              fill="none"
              stroke={v.kind === "artery" ? "var(--color-risk)" : "var(--color-chart-5)"}
              strokeWidth={v.width}
              strokeLinecap="round"
              opacity={v.kind === "artery" ? 0.5 : 0.38}
            />
          ))}
        </g>

        {down ? (
          <g style={{ transform: `translateY(${(-g * 70).toFixed(1)}px)`, transition: "transform 120ms linear" }}>
            <g style={{ opacity: lungsOpacity, transition: "opacity 200ms linear" }}>
              {[down.lungs.left, down.lungs.right].map((d, i) => (
                <path
                  key={`lung${i}`}
                  d={d}
                  fill="var(--color-chart-5)"
                  fillOpacity="0.07"
                  stroke="var(--color-chart-5)"
                  strokeOpacity="0.45"
                  strokeWidth="1.6"
                />
              ))}
              <text
                x={CX}
                y={down.lungs.y + 125 * reach}
                textAnchor="middle"
                className="fill-muted-foreground"
                fontSize="13"
                opacity="0.8"
              >
                poumons · échanges gazeux
              </text>
            </g>
            <g filter={`url(#glow-${uid})`} opacity="0.3">
              {down.vessels.map((v, i) => (
                <path
                  key={`dg${i}`}
                  d={v.d}
                  pathLength={1}
                  fill="none"
                  stroke={v.kind === "artery" ? "var(--color-risk)" : "var(--color-chart-5)"}
                  strokeWidth={v.width * 2.4}
                  strokeLinecap="round"
                  style={{ strokeDasharray: 1, strokeDashoffset: 1 - g }}
                />
              ))}
            </g>
            {down.vessels.map((v, i) => (
              <path
                key={`dv${i}`}
                d={v.d}
                pathLength={1}
                fill="none"
                stroke={v.kind === "artery" ? "var(--color-risk)" : "var(--color-chart-5)"}
                strokeWidth={v.width}
                strokeLinecap="round"
                opacity={v.kind === "artery" ? 0.6 : 0.45}
                style={{ strokeDasharray: 1, strokeDashoffset: 1 - g }}
              />
            ))}
            <g style={{ opacity: g > 0.9 ? 1 : 0, transition: "opacity 600ms ease" }}>
              {down.vessels.map((v, i) =>
                Array.from({ length: v.cells }, (_, c) => (
                  <circle
                    key={`dc${i}-${c}`}
                    r={Math.max(1.4, v.width * 0.42)}
                    fill={v.kind === "artery" ? "oklch(0.82 0.18 22)" : "oklch(0.8 0.1 300)"}
                    style={{
                      offsetPath: `path("${v.d}")`,
                      offsetRotate: "0deg",
                      animation: `flow calc(${v.duration}s / var(--flow-speed)) linear infinite`,
                      animationDelay: `${(-(c / v.cells) * v.duration).toFixed(2)}s`,
                      animationDirection: v.kind === "vein" ? "reverse" : "normal",
                    }}
                  />
                )),
              )}
            </g>
          </g>
        ) : null}

        {vessels.map((v, i) =>
          Array.from({ length: v.cells }, (_, c) => (
            <circle
              key={`c${i}-${c}`}
              r={Math.max(1.4, v.width * 0.42)}
              fill={v.kind === "artery" ? "oklch(0.82 0.18 22)" : "oklch(0.8 0.1 300)"}
              style={{
                offsetPath: `path("${v.d}")`,
                offsetRotate: "0deg",
                animation: `flow calc(${v.duration}s / var(--flow-speed)) linear infinite`,
                animationDelay: `${(-(c / v.cells) * v.duration).toFixed(2)}s`,
                animationDirection: v.kind === "vein" ? "reverse" : "normal",
                filter: "drop-shadow(0 0 3px currentColor)",
                color: v.kind === "artery" ? "oklch(0.7 0.22 22)" : "oklch(0.65 0.12 300)",
              }}
            />
          )),
        )}
      </svg>
    </div>
  );
}
