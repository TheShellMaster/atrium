import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { PatientRow } from "../lib/types";

export function Patients() {
  const [rows, setRows] = useState<PatientRow[]>([]);
  const [cloud, setCloud] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .patients()
      .then((data) => {
        setRows(data.items);
        setCloud(data.storage.supabase);
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  return (
    <>
      <div className="page-head">
        <div>
          <p className="kicker">registre</p>
          <h2>Les dossiers déjà lus</h2>
        </div>
        <p>
          Chaque prédiction est une ligne de base de données : c'est exactement le rôle de Supabase dans le cours.
          {cloud ? " Les écritures partent vers le projet cloud." : " En attendant les tables cloud, le registre vit en local."}
        </p>
      </div>
      {error ? <p>{error}</p> : null}
      <div className="chart-paper">
        {rows.length === 0 ? (
          <p>Aucun dossier. Ouvre un examen pour écrire la première ligne.</p>
        ) : (
          <table className="register">
            <thead>
              <tr>
                <th>dossier</th>
                <th>âge</th>
                <th>lecture</th>
                <th>probabilité</th>
                <th>quand</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.full_name || "anonyme"}</td>
                  <td>{row.age}</td>
                  <td>
                    <span className={row.predicted_label ? "pulse bad" : "pulse"} />
                    {row.predicted_label ? "atteint" : "préservé"}
                  </td>
                  <td>
                    {row.predicted_proba !== null && row.predicted_proba !== undefined
                      ? `${(Number(row.predicted_proba) * 100).toFixed(1)}%`
                      : "—"}
                  </td>
                  <td>{new Date(row.created_at).toLocaleString("fr-FR")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
