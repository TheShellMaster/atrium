import { useEffect } from "react";
import { useCabinet } from "../context/Cabinet";

export function MouseAura() {
  const { setPointer } = useCabinet();

  useEffect(() => {
    const onMove = (event: MouseEvent) => {
      const x = event.clientX / window.innerWidth;
      const y = event.clientY / window.innerHeight;
      document.documentElement.style.setProperty("--mx", `${event.clientX}px`);
      document.documentElement.style.setProperty("--my", `${event.clientY}px`);
      setPointer({ x, y });
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, [setPointer]);

  return <div className="aura" />;
}
