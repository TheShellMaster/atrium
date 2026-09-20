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
const CX = 500;
const CY = 300;

/** Générateur pseudo-aléatoire déterministe (même réseau à chaque rendu). */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

function polar(r: number, a: number, cx = CX, cy = CY): [number, number] {
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
function buildNetwork(seed: number, trunks: number): Vessel[] {
  const rand = rng(seed);
  const vessels: Vessel[] = [];

  const path = (pts: number[][]) =>
    `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)} C ${pts[1][0].toFixed(1)} ${pts[1][1].toFixed(1)}, ${pts[2][0].toFixed(1)} ${pts[2][1].toFixed(1)}, ${pts[3][0].toFixed(1)} ${pts[3][1].toFixed(1)}`;

  for (let i = 0; i < trunks; i++) {
    const a = (i / trunks) * Math.PI * 2 + (rand() - 0.5) * 0.5;
    const kind: Vessel["kind"] = i % 2 === 0 ? "artery" : "vein";
    const bend = (rand() - 0.5) * 2.2;
    const p0 = polar(105 + rand() * 25, a);
    const p1 = polar(190 + rand() * 60, a + bend * 0.35);
    const p2 = polar(330 + rand() * 90, a + bend * 0.85);
    const p3 = polar(640 + rand() * 80, a + bend * 0.55);
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

/**
 * Arrière-plan vasculaire : artères (rouge) et veines (violet) qui partent du cœur,
 * globules qui circulent le long des vaisseaux (offset-path), pulsation au rythme cardiaque.
 */
export function VesselBackground({
  className,
  seed = 7,
  trunks = 8,
  intensity = 1,
}: {
  className?: string;
  seed?: number;
  trunks?: number;
  intensity?: number;
}) {
  const { mood } = useCabinet();
  const uid = useId().replace(/:/g, "");
  const vessels = useMemo(() => buildNetwork(seed, trunks), [seed, trunks]);

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
          r="260"
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
