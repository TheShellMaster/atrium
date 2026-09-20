import { useCabinet } from "../context/Cabinet";

export function EcgRibbon() {
  const { mood } = useCabinet();
  const speed = mood === "warn" || mood === "contract" ? "1.6s" : mood === "expand" ? "6s" : "3.4s";
  return (
    <svg className="ecg" viewBox="0 0 1200 54" preserveAspectRatio="none" aria-hidden="true">
      <path
        d="M0 32 H80 L92 32 L100 8 L112 48 L120 32 H220 L232 32 L240 12 L252 44 L260 32 H420 L432 32 L440 6 L452 50 L460 32 H700 L712 32 L720 10 L732 46 L740 32 H980 L992 32 L1000 8 L1012 48 L1020 32 H1200"
        fill="none"
        stroke="#9b2348"
        strokeWidth="1.4"
        style={{
          strokeDasharray: 220,
          animation: `ecg ${speed} linear infinite`,
        }}
      />
      <style>{`@keyframes ecg { to { stroke-dashoffset: -220; } }
      @media (prefers-reduced-motion: reduce) { .ecg path { animation: none !important; } }`}</style>
    </svg>
  );
}
