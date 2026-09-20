import { useEffect, useState, type FormEvent } from "react";
import { api } from "../lib/api";
import { useData } from "../context/Data";
import type { Prediction } from "../lib/types";

export function Exam() {
  const { catalog } = useData();
  const [name, setName] = useState("");
  const [values, setValues] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Prediction | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (catalog) setValues(catalog.defaults);
  }, [catalog]);

  if (!catalog) return <p>Le cabinet prépare les instruments…</p>;

  const set = (key: string, raw: string) => {
    setValues((prev) => ({ ...prev, [key]: key === "oldpeak" ? Number(raw) : Number(raw) }));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const prediction = await api.predict({
        ...catalog.defaults,
        ...values,
        full_name: name || null,
        persist: true,
      });
      setResult(prediction);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Prédiction impossible");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="page-head">
        <div>
          <p className="kicker">feuille d'examen</p>
          <h2>Lire un patient</h2>
        </div>
        <p>
          Chaque case est une variable du jeu UCI Cleveland. Le modèle calcule d'abord un score, puis une
          probabilité. Le dossier est enregistré dans la base.
        </p>
      </div>
      <div className="split">
        <form className="chart-paper" onSubmit={submit}>
          <div className="field" style={{ gridColumn: "1 / -1", marginBottom: 12 }}>
            <label htmlFor="full_name">Nom du dossier</label>
            <input id="full_name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Patient 14" />
          </div>
          <div className="form-grid">
            {catalog.features.map((key) => {
              const meta = catalog.meta[key];
              const choices = catalog.choices[key];
              const value = values[key] ?? catalog.defaults[key];
              return (
                <div className="field" key={key}>
                  <label htmlFor={key}>
                    {meta.label}
                    {meta.unit ? ` (${meta.unit})` : ""}
                  </label>
                  {choices ? (
                    <select id={key} value={value} onChange={(e) => set(key, e.target.value)}>
                      {choices.map(([code, label]) => (
                        <option key={code} value={code}>
                          {label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      id={key}
                      type="number"
                      step={key === "oldpeak" ? "0.1" : "1"}
                      value={value}
                      onChange={(e) => set(key, e.target.value)}
                    />
                  )}
                  <small>{meta.hint}</small>
                </div>
              );
            })}
          </div>
          <div className="row" style={{ marginTop: 26 }}>
            <button className="btn" type="submit" disabled={busy}>
              {busy ? "Lecture…" : "Prédire le risque"}
            </button>
          </div>
          {error ? <p className="note">{error}</p> : null}
        </form>
        <aside className="chart-paper result">
          {result ? (
            <>
              <p className="kicker">probabilité</p>
              <div className={`big-risk risk-${result.risk}`}>{(result.probability * 100).toFixed(1)}%</div>
              <p>
                {result.label === 1
                  ? "Le modèle lit un accident cardiovasculaire probable."
                  : "Le modèle lit un profil plutôt préservé."}{" "}
                Seuil {result.threshold}. Risque {result.risk}.
              </p>
              <div className="bars">
                {result.contributions.slice(0, 8).map((row) => {
                  const width = Math.min(100, Math.abs(row.contribution) * 38);
                  return (
                    <div className="bar" key={row.feature}>
                      <span>{row.label}</span>
                      <i className={row.contribution < 0 ? "neg" : ""} style={{ width: `${width}%` }} />
                      <span>{row.contribution.toFixed(2)}</span>
                    </div>
                  );
                })}
              </div>
              <p className="note">
                Barre rouge : pousse vers « atteint ». Barre verte : pousse vers « indemne ». Ce sont les
                contributions au score z, pas des pourcentages médicaux.
              </p>
            </>
          ) : (
            <p>Remplissez la feuille. Le cœur attend le premier chiffre.</p>
          )}
        </aside>
      </div>
    </>
  );
}
