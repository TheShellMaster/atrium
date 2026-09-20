import { Link } from "react-router-dom";
import { HeartScene } from "../components/HeartScene";
import { Term, TermCard } from "../components/Term";
import { useTerm } from "../context/Data";

export function Home() {
  const systole = useTerm("systole");
  const diastole = useTerm("diastole");
  const angor = useTerm("angor");
  const regression = useTerm("regression");
  const fn = useTerm("fn");

  return (
    <section className="hero">
      <HeartScene />
      <div>
        <p className="kicker">salle d'observation</p>
        <h1>Le risque se lit avant la crise.</h1>
        <p className="lede">
          Atrium écoute {systole ? <Term term={systole}>la systole</Term> : "la systole"} et{" "}
          {diastole ? <Term term={diastole}>la diastole</Term> : "la diastole"} de 303 patients réels.
          Une {regression ? <Term term={regression}>régression logistique</Term> : "régression"} transforme
          tension, cholestérol, {angor ? <Term term={angor}>angor</Term> : "angor"} et tracé ECG en
          probabilité d'accident cardiovasculaire — et montre quand le modèle commet un{" "}
          {fn ? <Term term={fn}>faux négatif</Term> : "faux négatif"}.
        </p>
        <div className="row">
          <Link className="btn" to="/examen">
            Ouvrir un dossier
          </Link>
          <Link className="btn ghost" to="/modele">
            Voir le modèle
          </Link>
        </div>
        <TermCard />
      </div>
    </section>
  );
}
