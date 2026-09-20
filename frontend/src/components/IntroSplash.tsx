import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useLocation } from "react-router-dom";
import { GreenCross } from "@/components/GreenCross";
import { EcgLine } from "@/components/EcgLine";
import { Button } from "@/components/ui/button";

const KEY = "atrium-intro-played";
const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * Animation d'entrée : jouée une seule fois par session, uniquement quand on arrive
 * sur la racine du site. Un rafraîchissement sur une autre page n'affiche rien.
 */
export function IntroSplash() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(() => {
    if (typeof window === "undefined") return false;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const played = sessionStorage.getItem(KEY) === "1";
    return pathname === "/" && !played && !reduced;
  });

  useEffect(() => {
    if (!open) return;
    sessionStorage.setItem(KEY, "1");
    const timer = window.setTimeout(() => setOpen(false), 3400);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter" || e.key === " ") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="intro"
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-8 bg-background text-foreground"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.03, filter: "blur(8px)" }}
          transition={{ duration: 0.9, ease: EASE }}
          onClick={() => setOpen(false)}
          role="dialog"
          aria-label="Ouverture d'Atrium"
        >
          <div className="pointer-events-none absolute inset-0 bg-clinical-grid opacity-40" aria-hidden="true" />
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 1.1, ease: EASE }}
          >
            <GreenCross className="size-20" pulse />
          </motion.div>
          <div className="flex flex-col items-center gap-3 text-center">
            <motion.h1
              className="text-5xl font-semibold tracking-tight md:text-6xl"
              initial={{ opacity: 0, letterSpacing: "0.3em", y: 10 }}
              animate={{ opacity: 1, letterSpacing: "-0.02em", y: 0 }}
              transition={{ duration: 1.4, delay: 0.5, ease: EASE }}
            >
              Atrium
            </motion.h1>
            <motion.p
              className="max-w-md text-balance text-muted-foreground"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 1.2, ease: EASE }}
            >
              Lecture du risque cardiovasculaire · régression logistique sur 918 patients réels
            </motion.p>
          </div>
          <motion.div
            className="w-full max-w-2xl px-6"
            initial={{ opacity: 0, clipPath: "inset(0 100% 0 0)" }}
            animate={{ opacity: 1, clipPath: "inset(0 0% 0 0)" }}
            transition={{ duration: 1.6, delay: 0.9, ease: "linear" }}
          >
            <EcgLine className="h-16" seconds={3} grid={false} />
          </motion.div>
          <motion.div
            className="absolute bottom-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.6, duration: 0.8 }}
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
