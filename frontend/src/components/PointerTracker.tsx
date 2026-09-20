import { useEffect } from "react";
import { useCabinet } from "@/context/Cabinet";

/** Suit la souris (normalisée 0..1) pour la parallaxe du cœur. Invisible. */
export function PointerTracker() {
  const { setPointer } = useCabinet();
  useEffect(() => {
    let frame = 0;
    const onMove = (event: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() =>
        setPointer({ x: event.clientX / window.innerWidth, y: event.clientY / window.innerHeight }),
      );
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onMove);
    };
  }, [setPointer]);
  return null;
}
