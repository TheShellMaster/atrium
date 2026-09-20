import type { ReactNode } from "react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Badge } from "@/components/ui/badge";
import { useCabinet } from "@/context/Cabinet";
import { useTerm } from "@/context/Data";
import type { Term } from "@/lib/types";
import { cn } from "@/lib/utils";

const MOOD_LABEL: Record<Term["heart"], string> = {
  idle: "rythme de repos",
  contract: "systole · le cœur se serre",
  expand: "diastole · le cœur se remplit",
  warn: "alerte · le rythme s'emballe",
};

/**
 * Terme médical interactif : survol → définition dans une carte,
 * et le cœur 3D change de rythme (systole, diastole, alerte).
 */
export function MedTerm({
  id,
  term: given,
  children,
  className,
}: {
  id?: string;
  term?: Term;
  children?: ReactNode;
  className?: string;
}) {
  const found = useTerm(id ?? given?.id ?? "");
  const term = given ?? found;
  const { openTerm, activeTerm, setMood } = useCabinet();

  if (!term) return <span className={className}>{children}</span>;
  const active = activeTerm?.id === term.id;

  return (
    <HoverCard openDelay={120} closeDelay={80} onOpenChange={(open) => (open ? openTerm(term) : setMood("idle"))}>
      <HoverCardTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline cursor-help rounded-sm px-0.5 font-medium text-foreground underline decoration-primary/60 decoration-dotted decoration-2 underline-offset-[3px] transition-colors hover:bg-primary/10 hover:decoration-primary focus-visible:outline-2 focus-visible:outline-ring",
            active && "bg-primary/10 decoration-primary",
            className,
          )}
        >
          {children ?? term.word}
        </button>
      </HoverCardTrigger>
      <HoverCardContent align="start" className="w-80">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-base font-semibold">{term.word}</span>
            <Badge variant="secondary">{term.group}</Badge>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">{term.def}</p>
          <p className="text-xs text-primary">{MOOD_LABEL[term.heart]}</p>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
