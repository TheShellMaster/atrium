import { useEffect, useRef, useState, type ReactNode } from "react";
import { Popover } from "radix-ui";
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
 * Terme médical ou technique interactif : survol (souris) ou tap (écran tactile) → fenêtre
 * explicative, et le cœur 3D change de rythme (systole, diastole, alerte).
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
  const [open, setOpen] = useState(false);
  const timer = useRef<number | null>(null);
  const hoverable = typeof window !== "undefined" && window.matchMedia("(hover: hover)").matches;

  useEffect(() => () => {
    if (timer.current) window.clearTimeout(timer.current);
  }, []);

  if (!term) return <span className={className}>{children}</span>;
  const active = activeTerm?.id === term.id;

  const show = () => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      setOpen(true);
      openTerm(term);
    }, 110);
  };
  const hide = () => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      setOpen(false);
      setMood("idle");
    }, 140);
  };

  return (
    <Popover.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) openTerm(term);
        else setMood("idle");
      }}
    >
      <Popover.Trigger asChild>
        <button
          type="button"
          className={cn(
            "inline cursor-help rounded-sm px-0.5 font-medium text-foreground underline decoration-primary/60 decoration-dotted decoration-2 underline-offset-[3px] transition-colors hover:bg-primary/10 hover:decoration-primary focus-visible:outline-2 focus-visible:outline-ring",
            active && "bg-primary/10 decoration-primary",
            className,
          )}
          onMouseEnter={hoverable ? show : undefined}
          onMouseLeave={hoverable ? hide : undefined}
          onFocus={() => openTerm(term)}
          aria-label={`${term.word} : définition`}
        >
          {children ?? term.word}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side="bottom"
          align="start"
          sideOffset={6}
          collisionPadding={12}
          onMouseEnter={hoverable ? show : undefined}
          onMouseLeave={hoverable ? hide : undefined}
          onOpenAutoFocus={(e) => e.preventDefault()}
          className="z-50 w-[min(20rem,calc(100vw-1.5rem))] rounded-lg border bg-popover p-4 text-popover-foreground shadow-md outline-hidden data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
        >
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-base font-semibold">{term.word}</span>
              <Badge variant="secondary" className="capitalize">
                {term.group}
              </Badge>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">{term.def}</p>
            <p className="text-xs text-primary">{MOOD_LABEL[term.heart]}</p>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
