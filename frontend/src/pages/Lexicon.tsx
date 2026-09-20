import { HeartScene } from "../components/HeartScene";
import { TermCard } from "../components/Term";
import { useCabinet } from "../context/Cabinet";
import { useData } from "../context/Data";

export function Lexicon() {
  const { catalog } = useData();
  const { openTerm, activeTerm } = useCabinet();
  if (!catalog) return <p>Le lexique s'imprime…</p>;

  return (
    <>
      <div className="page-head">
        <div>
          <p className="kicker">vocabulaire</p>
          <h2>Les mots qui font battre le cabinet</h2>
        </div>
        <p>Survole un terme. Le cœur change de respiration : systole serrée, diastole ample, alerte d'angor.</p>
      </div>
      <div className="split">
        <div className="lex-list">
          {catalog.terms.map((term) => (
            <article className="lex-item" key={term.id}>
              <button type="button" onMouseEnter={() => openTerm(term)} onFocus={() => openTerm(term)}>
                {term.word}
              </button>
              {activeTerm?.id === term.id ? <p>{term.def}</p> : <p>{term.group}</p>}
            </article>
          ))}
        </div>
        <div>
          <HeartScene />
          <TermCard />
        </div>
      </div>
    </>
  );
}
