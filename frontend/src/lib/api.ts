import type { Catalog, ModelCard, PatientRow, Prediction } from "./types";

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
};
