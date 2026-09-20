import { useEffect, useRef } from "react";
import { animate, useInView } from "motion/react";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Tone = "default" | "safe" | "risk" | "warn";

const TONE_TEXT: Record<Tone, string> = {
  default: "text-foreground",
  safe: "text-safe dark:glow-text",
  risk: "text-risk dark:glow-text",
  warn: "text-warn dark:glow-text",
};

/** Chiffre animé (compte lentement jusqu'à la valeur). */
export function CountUp({
  value,
  format = (v) => v.toFixed(0),
  duration = 1.6,
  className,
}: {
  value: number;
  format?: (v: number) => string;
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });
  useEffect(() => {
    const node = ref.current;
    if (!node || !inView) return;
    const controls = animate(0, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => {
        node.textContent = format(v);
      },
    });
    return () => controls.stop();
  }, [value, inView, duration, format]);
  return (
    <span ref={ref} className={cn("tabular-nums", className)}>
      {format(0)}
    </span>
  );
}

export function StatCard({
  label,
  value,
  format,
  suffix,
  hint,
  icon: Icon,
  tone = "default",
  badge,
  className,
}: {
  label: string;
  value: number;
  format?: (v: number) => string;
  suffix?: string;
  hint?: string;
  icon?: LucideIcon;
  tone?: Tone;
  badge?: string;
  className?: string;
}) {
  return (
    <Card size="sm" className={cn("relative overflow-hidden", className)}>
      <CardHeader>
        <CardDescription className="flex items-center gap-2">
          {Icon ? <Icon className="size-4 text-muted-foreground" /> : null}
          {label}
        </CardDescription>
        <CardTitle className={cn("text-3xl font-semibold tracking-tight", TONE_TEXT[tone])}>
          <CountUp value={value} format={format} />
          {suffix ? <span className="ml-1 text-base font-medium text-muted-foreground">{suffix}</span> : null}
        </CardTitle>
      </CardHeader>
      {hint || badge ? (
        <CardContent className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>{hint}</span>
          {badge ? <Badge variant="outline">{badge}</Badge> : null}
        </CardContent>
      ) : null}
    </Card>
  );
}
