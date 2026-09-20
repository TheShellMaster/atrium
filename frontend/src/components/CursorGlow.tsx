import { useCabinet } from "@/context/Cabinet";

/** Lueur douce qui suit la souris (mode sombre uniquement). */
export function CursorGlow() {
  const { pointer, mood } = useCabinet();
  const color = mood === "warn" ? "oklch(0.68 0.2 22 / 10%)" : "oklch(0.76 0.16 160 / 9%)";
  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 hidden transition-[background] duration-700 dark:block"
      style={{
        background: `radial-gradient(520px circle at ${(pointer.x * 100).toFixed(2)}% ${(pointer.y * 100).toFixed(2)}%, ${color}, transparent 70%)`,
      }}
      aria-hidden="true"
    />
  );
}
