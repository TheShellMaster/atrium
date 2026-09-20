import type { Catalog, ImportResult, ModelCard, PatientRow, Prediction, Regression, Stats } from "./types";

async function read<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || response.statusText);
  }
  return response.json() as Promise<T>;
}

export const api = {
  catalog: () => read<Catalog>("/api/catalog"),
  model: () => read<ModelCard>("/api/model"),
  retrain: () => read<ModelCard>("/api/model/retrain", { method: "POST" }),
  patients: () => read<{ items: PatientRow[]; storage: { supabase: boolean; sqlite: string } }>("/api/patients"),
  predict: (body: Record<string, unknown>) =>
    read<Prediction>("/api/predict", { method: "POST", body: JSON.stringify(body) }),
  stats: () => read<Stats>("/api/stats"),
  regression: (x: string, y: string) => read<Regression>(`/api/regression?x=${x}&y=${y}`),
  importFile: async (file: File, persist = true): Promise<ImportResult> => {
    const body = new FormData();
    body.append("file", file);
    const response = await fetch(`/api/import?persist=${persist}`, { method: "POST", body });
    if (!response.ok) {
      const text = await response.text();
      let detail = text;
      try {
        detail = (JSON.parse(text) as { detail?: string }).detail ?? text;
      } catch {
        /* texte brut */
      }
      throw new Error(detail || response.statusText);
    }
    return response.json() as Promise<ImportResult>;
  },
  exportUrl: (format: "csv" | "xlsx") => `/api/export?format=${format}`,
  templateUrl: "/api/template.csv",
};
