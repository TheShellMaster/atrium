import { NavLink } from "react-router-dom";

const LINKS = [
  ["/", "cabinet"],
  ["/examen", "examen"],
  ["/modele", "modèle"],
  ["/patients", "registre"],
  ["/lexique", "lexique"],
] as const;

export function Nav() {
  return (
    <header className="nav">
      <div className="brand">
        <strong>Atrium</strong>
        <span>cabinet de lecture cardiovasculaire</span>
      </div>
      <nav className="links">
        {LINKS.map(([to, label]) => (
          <NavLink key={to} to={to} end={to === "/"} className={({ isActive }) => (isActive ? "active" : "")}>
            {label}
          </NavLink>
        ))}
      </nav>
    </header>
  );
}
