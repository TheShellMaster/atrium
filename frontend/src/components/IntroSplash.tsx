import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { GreenCross } from "@/components/GreenCross";
import { EcgLine } from "@/components/EcgLine";
import { Button } from "@/components/ui/button";
import { useData } from "@/context/Data";

const EASE = [0.16, 1, 0.3, 1] as const;
const DURATION_MS = 5600;

/**
 * Animation d'ouverture : jouée à chaque chargement ou rafraîchissement, quelle que soit la page.
 * La page courante reste celle de l'URL une fois l'intro terminée.
 */
export function IntroSplash() {
  const { model, error } = useData();
  const [open, setOpen] = useState(() => {
    if (typeof window === "undefined") return false;
    return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => setOpen(false), DURATION_MS);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter" || e.key === " ") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const status = error
    ? "API en attente…"
    : model
      ? `Modèle prêt · ${model.n_total} patients · AUC ${model.auc.toFixed(3)}`
      : "Chargement du modèle…";

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="intro"
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-10 bg-background text-foreground"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.04, filter: "blur(10px)" }}
          transition={{ duration: 1.1, ease: EASE }}
          onClick={() => setOpen(false)}
          role="dialog"
          aria-label="Ouverture d'Atrium"
        >
          <div className="pointer-events-none absolute inset-0 bg-clinical-grid opacity-40" aria-hidden="true" />
          <motion.div
            className="pointer-events-none absolute size-[60vmin] rounded-full bg-primary/10 blur-3xl"
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: [0.4, 1, 1.08, 1], opacity: [0, 0.8, 0.6, 0.8] }}
            transition={{ duration: 4.6, ease: "easeInOut", times: [0, 0.35, 0.7, 1] }}
            aria-hidden="true"
          />

          <motion.div
            initial={{ scale: 0.5, opacity: 0, rotate: -8 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            transition={{ duration: 1.5, ease: EASE }}
            className="relative"
          >
            <GreenCross className="size-24" pulse />
          </motion.div>

          <div className="flex flex-col items-center gap-3 text-center">
            <motion.h1
              className="text-6xl font-semibold tracking-tight md:text-7xl"
              initial={{ opacity: 0, letterSpacing: "0.45em", y: 14 }}
              animate={{ opacity: 1, letterSpacing: "-0.02em", y: 0 }}
              transition={{ duration: 2, delay: 0.6, ease: EASE }}
            >
              Atrium
            </motion.h1>
            <motion.p
              className="max-w-md text-balance text-muted-foreground md:text-lg"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.2, delay: 1.6, ease: EASE }}
            >
              Lecture du risque cardiovasculaire · régression logistique sur des patients réels
            </motion.p>
          </div>

          <motion.div
            className="w-full max-w-3xl px-6"
            initial={{ opacity: 0, clipPath: "inset(0 100% 0 0)" }}
            animate={{ opacity: 1, clipPath: "inset(0 0% 0 0)" }}
            transition={{ duration: 2.6, delay: 1.2, ease: "linear" }}
          >
            <EcgLine className="h-20" seconds={3.2} grid={false} />
          </motion.div>

          <motion.p
            key={status}
            className="text-sm text-muted-foreground"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 2.4 }}
          >
            {status}
          </motion.p>

          <motion.div
            className="absolute bottom-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2.2, duration: 0.8 }}
          >
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Entrer dans le cabinet
            </Button>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
