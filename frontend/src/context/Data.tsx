import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "../lib/api";
import type { Catalog, ModelCard } from "../lib/types";

type DataValue = {
  catalog: Catalog | null;
  model: ModelCard | null;
  error: string | null;
  reload: () => void;
};

const DataContext = createContext<DataValue | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [model, setModel] = useState<ModelCard | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = () => {
    Promise.all([api.catalog(), api.model()])
      .then(([c, m]) => {
        setCatalog(c);
        setModel(m);
        setError(null);
      })
      .catch((err: Error) => setError(err.message));
  };

  useEffect(() => {
    reload();
    const again = window.setTimeout(reload, 1200);
    return () => window.clearTimeout(again);
  }, []);

  return <DataContext.Provider value={{ catalog, model, error, reload }}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("Données manquantes");
  return ctx;
}

export function useTerm(id: string) {
  const { catalog } = useData();
  return catalog?.terms.find((term) => term.id === id);
}
