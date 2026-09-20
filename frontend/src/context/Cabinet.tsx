import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { HeartMood, Term } from "@/lib/types";
import { audio } from "@/lib/audio";

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
  /** Effets sonores (battements, moniteur). */
  soundOn: boolean;
  toggleSound: () => void;
};

const CabinetContext = createContext<CabinetValue | null>(null);
const SOUND_KEY = "atrium-sound";

export function CabinetProvider({ children }: { children: ReactNode }) {
  const [mood, setMood] = useState<HeartMood>("idle");
  const [activeTerm, setActiveTerm] = useState<Term | null>(null);
  const [pointer, setPointer] = useState({ x: 0.5, y: 0.5 });
  const [soundOn, setSoundOn] = useState(false);

  useEffect(() => {
    if (soundOn) audio.enable();
    else audio.disable();
    localStorage.setItem(SOUND_KEY, soundOn ? "1" : "0");
  }, [soundOn]);

  const openTerm = useCallback((term: Term | null) => {
    setActiveTerm(term);
    setMood(term?.heart ?? "idle");
    if (term) audio.tick();
  }, []);

  const toggleSound = useCallback(() => setSoundOn((s) => !s), []);

  const value = useMemo(
    () => ({ mood, setMood, activeTerm, openTerm, pointer, setPointer, soundOn, toggleSound }),
    [mood, activeTerm, openTerm, pointer, soundOn, toggleSound],
  );

  return <CabinetContext.Provider value={value}>{children}</CabinetContext.Provider>;
}

export function useCabinet() {
  const ctx = useContext(CabinetContext);
  if (!ctx) throw new Error("CabinetProvider manquant");
  return ctx;
}
