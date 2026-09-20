import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "@/lib/api";
import type { Catalog, ModelCard } from "@/lib/types";

type DataValue = {
  catalog: Catalog | null;
  model: ModelCard | null;
  error: string | null;
  loading: boolean;
  reload: () => void;
};

const DataContext = createContext<DataValue | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [model, setModel] = useState<ModelCard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(() => {
    setLoading(true);
    Promise.all([api.catalog(), api.model()])
      .then(([c, m]) => {
        setCatalog(c);
        setModel(m);
        setError(null);
      })
      .catch((err: Error) => setError(err.message || "API injoignable"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    reload();
    const retry = window.setTimeout(reload, 1500);
    return () => window.clearTimeout(retry);
  }, [reload]);

  return (
    <DataContext.Provider value={{ catalog, model, error, loading, reload }}>{children}</DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("DataProvider manquant");
  return ctx;
}

export function useTerm(id: string) {
  const { catalog } = useData();
  return catalog?.terms.find((term) => term.id === id);
}
