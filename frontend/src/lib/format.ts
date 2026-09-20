export function pct(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${(value * 100).toFixed(digits)} %`;
}

export function num(value: number | null | undefined, digits = 2): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return value.toFixed(digits);
}

export function riskTone(risk: string): "safe" | "warn" | "risk" {
  if (risk === "faible") return "safe";
  if (risk === "modéré") return "warn";
  return "risk";
}

export function dateFr(iso: string): string {
  return new Date(iso).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" });
}
