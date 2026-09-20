import { useCabinet } from "../context/Cabinet";
import type { Term as TermType } from "../lib/types";

export function Term({ term, children }: { term: TermType; children?: string }) {
  const { activeTerm, openTerm } = useCabinet();
  const on = activeTerm?.id === term.id;
  return (
    <button
      type="button"
      className={on ? "term is-on" : "term"}
      onMouseEnter={() => openTerm(term)}
      onFocus={() => openTerm(term)}
      onClick={() => openTerm(on ? null : term)}
    >
      {children ?? term.word}
    </button>
  );
}

export function TermCard() {
  const { activeTerm } = useCabinet();
  if (!activeTerm) return null;
  return (
    <aside className="defcard">
      <b>{activeTerm.word}</b>
      <p>{activeTerm.def}</p>
    </aside>
  );
}
