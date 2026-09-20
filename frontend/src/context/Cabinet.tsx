import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { HeartMood, Term } from "@/lib/types";

type CabinetValue = {
  /** Rythme actuel du cœur 3D. */
  mood: HeartMood;
  setMood: (mood: HeartMood) => void;
  /** Terme médical actuellement survolé. */
  activeTerm: Term | null;
  openTerm: (term: Term | null) => void;
  /** Position de la souris normalisée (0..1). */
  pointer: { x: number; y: number };
  setPointer: (point: { x: number; y: number }) => void;
};

const CabinetContext = createContext<CabinetValue | null>(null);

export function CabinetProvider({ children }: { children: ReactNode }) {
  const [mood, setMood] = useState<HeartMood>("idle");
  const [activeTerm, setActiveTerm] = useState<Term | null>(null);
  const [pointer, setPointer] = useState({ x: 0.5, y: 0.5 });

  const openTerm = useCallback((term: Term | null) => {
    setActiveTerm(term);
    setMood(term?.heart ?? "idle");
  }, []);

  const value = useMemo(
    () => ({ mood, setMood, activeTerm, openTerm, pointer, setPointer }),
    [mood, activeTerm, openTerm, pointer],
  );

  return <CabinetContext.Provider value={value}>{children}</CabinetContext.Provider>;
}

export function useCabinet() {
  const ctx = useContext(CabinetContext);
  if (!ctx) throw new Error("CabinetProvider manquant");
  return ctx;
}
