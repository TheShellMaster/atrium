import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { HeartMood, Term } from "../lib/types";

type CabinetValue = {
  mood: HeartMood;
  activeTerm: Term | null;
  setMood: (mood: HeartMood) => void;
  openTerm: (term: Term | null) => void;
  pointer: { x: number; y: number };
  setPointer: (point: { x: number; y: number }) => void;
};

const CabinetContext = createContext<CabinetValue | null>(null);

export function CabinetProvider({ children }: { children: ReactNode }) {
  const [mood, setMood] = useState<HeartMood>("idle");
  const [activeTerm, setActiveTerm] = useState<Term | null>(null);
  const [pointer, setPointer] = useState({ x: 0.5, y: 0.5 });

  const value = useMemo(
    () => ({
      mood,
      activeTerm,
      setMood,
      openTerm: (term: Term | null) => {
        setActiveTerm(term);
        setMood(term?.heart ?? "idle");
      },
      pointer,
      setPointer,
    }),
    [mood, activeTerm, pointer],
  );

  return <CabinetContext.Provider value={value}>{children}</CabinetContext.Provider>;
}

export function useCabinet() {
  const ctx = useContext(CabinetContext);
  if (!ctx) throw new Error("Cabinet manquant");
  return ctx;
}
