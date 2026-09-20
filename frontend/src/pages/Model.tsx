import { useData } from "../context/Data";

function pct(value?: number) {
  return value === undefined ? "—" : `${(value * 100).toFixed(1)}%`;
}

export function Model() {
  const { model, catalog } = useData();
  if (!model) return <p>Le modèle s'entraîne encore…</p>;

  const roc = model.roc;
  const path = roc.fpr.map((x, i) => `${i === 0 ? "M" : "L"} ${20 + x * 260} ${280 - roc.tpr[i] * 260}`).join(" ");

  return (
    <>
      <div className="page-head">
        <div>
          <p className="kicker">laboratoire</p>
          <h2>Régression, graphes, VP / FN</h2>
        </div>
        <p>
          {model.dataset}. {model.n_train} patients pour apprendre, {model.n_test} pour tester. Rien n'est inventé :
          le modèle n'a le droit de se vanter que sur des dossiers qu'il n'a pas vus.
        </p>
      </div>

      <div className="split">
        <div className="chart-paper">
          <p className="kicker">matrice de confusion</p>
          <div className="matrix">
            <div className="cell vp">
              <span>vrais positifs</span>
              <strong>{model.vp}</strong>
              <p>malades bien trouvés</p>
            </div>
            <div className="cell fn">
              <span>faux négatifs</span>
              <strong>{model.fn}</strong>
              <p>malades rassurés à tort</p>
            </div>
            <div className="cell fp">
              <span>faux positifs</span>
              <strong>{model.fp}</strong>
              <p>sains alarmés à tort</p>
            </div>
            <div className="cell vn">
              <span>vrais négatifs</span>
              <strong>{model.vn}</strong>
              <p>sains bien rassurés</p>
            </div>
          </div>
          <p className="note" style={{ marginTop: 16 }}>
            Exactitude {pct(model.accuracy)} · précision {pct(model.precision)} · sensibilité {pct(model.recall)} ·
            spécificité {pct(model.specificity)} · F1 {pct(model.f1)} · AUC {model.auc.toFixed(3)}
          </p>
        </div>
        <div className="chart-paper">
          <p className="kicker">courbe ROC</p>
          <svg viewBox="0 0 300 300" width="100%" height="280">
            <rect x="20" y="20" width="260" height="260" fill="transparent" stroke="#8ea393" />
            <line x1="20" y1="280" x2="280" y2="20" stroke="#c5d0c2" />
            <path d={path} fill="none" stroke="#9b2348" strokeWidth="2" />
          </svg>
          <p className="note">
            Plus la courbe rouge s'éloigne de la diagonale, moins le modèle joue à pile ou face. AUC = {model.auc.toFixed(3)}.
          </p>
        </div>
      </div>

      <div className="split" style={{ marginTop: 28 }}>
        <div className="chart-paper formulas">
          <p className="kicker">formules du cours</p>
          {(catalog?.formulas ?? []).map((formula) => (
            <article className="formula" key={formula.id}>
              <b>{formula.title}</b>
              <div>
                <em>{formula.latex}</em>
              </div>
              <p>{formula.plain}</p>
            </article>
          ))}
        </div>
        <div className="chart-paper">
          <p className="kicker">coefficients appris</p>
          <div className="bars">
            {model.coefficients.slice(0, 12).map((row) => (
              <div className="bar" key={row.name}>
                <span>{row.name.replace("num__", "").replace("cat__", "")}</span>
                <i className={row.coef < 0 ? "neg" : ""} style={{ width: `${Math.min(100, Math.abs(row.coef) * 28)}%` }} />
                <span>{row.coef.toFixed(2)}</span>
              </div>
            ))}
          </div>
          <p className="note">Intercept {model.intercept.toFixed(3)}. Stockage cloud : {model.storage.supabase ? "Supabase actif" : "copie locale SQLite"}.</p>
        </div>
      </div>
    </>
  );
}
