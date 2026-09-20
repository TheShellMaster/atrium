import { cn } from "@/lib/utils";
import { useCabinet } from "@/context/Cabinet";

const TRACE =
  "M0 30 H60 L70 30 L76 12 L84 46 L90 30 H160 L170 30 L176 16 L184 42 L190 30 H280 L290 30 L296 8 L304 50 L310 30 H400 L410 30 L416 14 L424 44 L430 30 H520 L530 30 L536 10 L544 48 L550 30 H600";

/** Tracé ECG animé. Accélère quand le cœur s'emballe. */
export function EcgLine({ className, tone }: { className?: string; tone?: "safe" | "risk" | "muted" }) {
  const { mood } = useCabinet();
  const duration = mood === "warn" ? "1.4s" : mood === "contract" ? "2s" : mood === "expand" ? "5s" : "3.2s";
  const color =
    tone === "risk" || mood === "warn"
      ? "stroke-risk"
      : tone === "muted"
        ? "stroke-muted-foreground/60"
        : "stroke-primary";
  return (
    <svg
      viewBox="0 0 600 60"
      preserveAspectRatio="none"
      className={cn("h-10 w-full", className)}
      aria-hidden="true"
    >
      <path d={TRACE} className="stroke-border" strokeWidth="1" fill="none" />
      <path
        d={TRACE}
        className={cn(color, "fill-none")}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ strokeDasharray: "180 1020", animation: `ecg ${duration} linear infinite` }}
      />
    </svg>
  );
}
