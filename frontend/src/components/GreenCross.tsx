import { cn } from "@/lib/utils";

/** Marque Atrium : la croix verte des officines, en pastille. */
export function GreenCross({ className, pulse = false }: { className?: string; pulse?: boolean }) {
  return (
    <span className={cn("relative inline-flex shrink-0", className)} aria-hidden="true">
      {pulse ? <span className="absolute inset-0 rounded-[28%] bg-primary/40 animate-pulse-ring" /> : null}
      <svg viewBox="0 0 32 32" className="relative size-full" fill="none">
        <rect x="1" y="1" width="30" height="30" rx="9" className="fill-primary" />
        <path
          d="M13 7h6v6h6v6h-6v6h-6v-6H7v-6h6z"
          className="fill-primary-foreground"
        />
      </svg>
    </span>
  );
}
