import { Link } from "react-router-dom";
import { ExternalLinkIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/PageHeader";
import { MedTerm } from "@/components/MedTerm";
import { Reveal, RevealGroup, RevealItem } from "@/components/Reveal";
import { useData } from "@/context/Data";
import { api } from "@/lib/api";
import { num, pct } from "@/lib/format";

const ENDPOINTS = [
  ["GET", "/api/health", "État de l'API et du stockage (Supabase ou SQLite)."],
  ["GET", "/api/catalog", "Variables, libellés, choix, lexique, formules."],
  ["GET", "/api/model", "Fiche du modèle : métriques, VP/FN, ROC, sigmoïde, coefficients, sources."],
  ["POST", "/api/model/retrain", "Ré-entraîne la régression logistique et enregistre les métriques."],
  ["POST", "/api/predict", "Prédit un patient (13 variables) et l'enregistre dans le registre."],
  ["GET", "/api/patients", "Registre des dossiers (Supabase, repli SQLite)."],
  ["GET", "/api/stats", "Statistiques descriptives, histogrammes, corrélations, hôpitaux."],
  ["GET", "/api/regression?x=age&y=thalach", "Régression linéaire entre deux variables numériques."],
  ["POST", "/api/import", "Import CSV ou Excel : prédiction en lot, enregistrement optionnel."],
  ["GET", "/api/export?format=csv|xlsx", "Export du registre (et des métriques en Excel)."],
  ["GET", "/api/template.csv", "Modèle de fichier d'import."],
];

const TABLES = [
  ["patients", "Un dossier par examen : 13 variables, probabilité, label prédit, label réel (import), notes."],
  ["predictions", "Journal des prédictions : features, probabilité, seuil, contributions par variable."],
  ["model_metrics", "Une ligne par entraînement : exactitude, précision, sensibilité, spécificité, F1, AUC, VP/VN/FP/FN, coefficients."],
];

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <Card id={id} className="scroll-mt-20">
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-sm leading-relaxed">{children}</CardContent>
    </Card>
  );
}

export function Docs() {
  const { model } = useData();

  return (
    <>
      <Reveal>
        <PageHeader
          title="Documentation"
          description="Tout ce qu'il faut savoir pour comprendre, présenter et faire tourner Atrium : données, modèle, interface, API, base et animations."
          actions={
            <>
              <Button variant="outline" size="sm" asChild>
                <a href="https://github.com/TheShellMaster/atrium" target="_blank" rel="noreferrer">
                  Dépôt GitHub
                  <ExternalLinkIcon data-icon="inline-end" />
                </a>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a href={api.docsUrl} target="_blank" rel="noreferrer">
                  Swagger de l'API
                  <ExternalLinkIcon data-icon="inline-end" />
                </a>
              </Button>
            </>
          }
        />
      </Reveal>

      <Reveal delay={0.06}>
        <div className="flex flex-wrap gap-2">
          {[
            ["#objectif", "Objectif"],
            ["#architecture", "Architecture"],
            ["#donnees", "Données"],
            ["#modele", "Modèle"],
            ["#pages", "Pages"],
            ["#api", "API"],
            ["#base", "Base Supabase"],
            ["#interface", "Interface & animations"],
            ["#lancer", "Lancer le projet"],
            ["#demo", "Déroulé de présentation"],
            ["#credits", "Crédits"],
          ].map(([href, label]) => (
            <Button key={href} variant="secondary" size="sm" asChild>
              <a href={href}>{label}</a>
            </Button>
          ))}
        </div>
      </Reveal>

      <RevealGroup className="flex flex-col gap-4" stagger={0.06}>
        <RevealItem>
          <Section id="objectif" title="1. Objectif">
            <p>
              Atrium estime la probabilité qu'un patient soit atteint d'une maladie coronarienne (rétrécissement de plus de 50 %
              d'une artère du cœur), le type d'atteinte qui mène à l'<MedTerm id="angor">angor</MedTerm> et à l'
              <MedTerm id="infarctus">infarctus</MedTerm>. Il s'appuie sur des données publiées de vrais patients et sur une{" "}
              <MedTerm id="regression">régression logistique</MedTerm>, le modèle du cours, dont chaque étape est visible dans
              l'interface : données, statistiques, formules, métriques, prédiction.
            </p>
            <p className="text-muted-foreground">
              Public : étudiants et enseignants. Ce n'est pas un dispositif médical ; c'est un outil pédagogique qui montre comment
              une prédiction se construit et où elle se trompe.
            </p>
          </Section>
        </RevealItem>

        <RevealItem>
          <Section id="architecture" title="2. Architecture">
            <div className="grid gap-3 md:grid-cols-3">
              {[
                ["Frontend", "React 19, Vite, TypeScript, Tailwind v4, shadcn/ui, recharts, motion, Three.js", "Pages, graphiques, cœur 3D, ECG, sons"],
                ["API Python", "FastAPI, Pydantic, scikit-learn, pandas, numpy", "Entraînement, prédiction, statistiques, import/export"],
                ["Données", "Supabase (PostgreSQL + PostgREST + RLS), repli SQLite", "Patients, prédictions, métriques"],
              ].map(([title, stack, role]) => (
                <div key={title} className="rounded-lg border bg-muted/40 p-3">
                  <div className="font-medium">{title}</div>
                  <div className="text-xs text-muted-foreground">{stack}</div>
                  <Separator className="my-2" />
                  <div className="text-xs">{role}</div>
                </div>
              ))}
            </div>
            <p>
              Le navigateur appelle l'<MedTerm id="api">API REST</MedTerm> (proxy Vite <code>/api</code> → port 8000). L'API charge le
              modèle scikit-learn sérialisé, calcule, puis écrit dans <MedTerm id="supabase">Supabase</MedTerm> via PostgREST. Si le
              cloud est injoignable, elle bascule sur une copie SQLite locale pour que la démonstration ne tombe jamais.
            </p>
          </Section>
        </RevealItem>

        <RevealItem>
          <Section id="donnees" title="3. Données">
            <p>
              Jeu <MedTerm id="uci">UCI Heart Disease</MedTerm> : quatre hôpitaux (Cleveland Clinic, Institut de cardiologie de
              Budapest, hôpitaux universitaires de Zurich et Bâle, VA Medical Center de Long Beach), {model?.n_total ?? "918"}{" "}
              patients après suppression des doublons, 13 variables cliniques et une cible binaire.
            </p>
            <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
              <li>Décodage documenté dans <code>backend/src/atrium/data.py</code> : type de douleur 1–4 → 0–3, pente 1–3 → 0–2, thallium 3/6/7 → normal / défaut fixe / réversible, cible « num » 0–4 → 0 / 1.</li>
              <li>Valeurs manquantes (« ? », cholestérol à 0 en Suisse) conservées puis imputées dans le pipeline : médiane pour le numérique, mode pour le catégoriel.</li>
              <li>Piège évité : la copie Kaggle très diffusée a la cible inversée (1 = sain). Atrium repart des fichiers UCI officiels.</li>
            </ul>
            {model ? (
              <div className="flex flex-wrap gap-2">
                {model.sources.map((s) => (
                  <Badge key={s.source} variant="outline">
                    {s.label} · {s.n} · {pct(s.positive_rate, 0)} atteints
                  </Badge>
                ))}
              </div>
            ) : null}
          </Section>
        </RevealItem>

        <RevealItem>
          <Section id="modele" title="4. Modèle">
            <ol className="list-decimal space-y-1 pl-5">
              <li>
                Séparation <MedTerm id="stratifie">stratifiée</MedTerm> <MedTerm id="train_test">entraînement / test</MedTerm> (75 % / 25 %).
              </li>
              <li>
                <MedTerm id="standardisation">Standardisation</MedTerm> des variables numériques, <MedTerm id="onehot">one-hot</MedTerm> des
                catégorielles.
              </li>
              <li>
                <MedTerm id="regression">Régression logistique</MedTerm> : <MedTerm id="logit">score z</MedTerm> = b₀ + Σ bᵢ·xᵢ puis{" "}
                <MedTerm id="sigmoide">sigmoïde</MedTerm> P = 1 / (1 + e⁻ᶻ).
              </li>
              <li>
                <MedTerm id="seuil">Seuil</MedTerm> 0,5 → atteint / préservé ; <MedTerm id="matrice">matrice de confusion</MedTerm> sur le jeu de
                test.
              </li>
            </ol>
            {model ? (
              <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
                {[
                  ["Exactitude", pct(model.accuracy)],
                  ["Précision", pct(model.precision)],
                  ["Sensibilité", pct(model.recall)],
                  ["Spécificité", pct(model.specificity)],
                  ["F1", pct(model.f1)],
                  ["AUC", num(model.auc, 3)],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-lg border bg-muted/40 p-3">
                    <div className="text-xs text-muted-foreground">{k}</div>
                    <div className="text-lg font-semibold tabular-nums">{v}</div>
                  </div>
                ))}
              </div>
            ) : null}
            <p className="text-muted-foreground">
              Les <MedTerm id="coefficient">coefficients</MedTerm>, la <MedTerm id="roc">courbe ROC</MedTerm>, l'
              <MedTerm id="auc">AUC</MedTerm> et la <MedTerm id="lineaire">régression linéaire</MedTerm> sont détaillés dans la page{" "}
              <Link className="underline" to="/modele">Modèle</Link>.
            </p>
          </Section>
        </RevealItem>

        <RevealItem>
          <Section id="pages" title="5. Pages">
            <div className="overflow-x-auto">
            <Table>
              <TableBody>
                {[
                  ["/", "Tableau de bord", "Indicateurs du modèle, état du cœur, matrice de confusion, derniers dossiers."],
                  ["/examen", "Examen", "Feuille d'examen 13 variables, prédiction, contributions au score, enregistrement."],
                  ["/modele", "Modèle", "Matrice VP/FN, sigmoïde, ROC, coefficients, régression linéaire, formules, données."],
                  ["/statistiques", "Statistiques", "Hôpitaux, équilibre des classes, tableau descriptif, histogrammes, corrélations."],
                  ["/patients", "Registre", "Dossiers Supabase, recherche, filtres, import CSV/Excel, export CSV/Excel."],
                  ["/lexique", "Lexique", "Vocabulaire médical, statistique et technique ; le cœur réagit à chaque terme."],
                  ["/documentation", "Documentation", "Cette page."],
                ].map(([path, name, desc]) => (
                  <TableRow key={path}>
                    <TableCell className="font-mono text-xs">{path}</TableCell>
                    <TableCell className="font-medium">
                      <Link to={path} className="underline-offset-4 hover:underline">
                        {name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{desc}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          </Section>
        </RevealItem>

        <RevealItem>
          <Section id="api" title="6. API (FastAPI)">
            <p>
              Documentation interactive générée par <MedTerm id="fastapi">FastAPI</MedTerm> sur <code>http://127.0.0.1:8000/docs</code>.
            </p>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Méthode</TableHead>
                    <TableHead>Route</TableHead>
                    <TableHead>Rôle</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ENDPOINTS.map(([method, path, desc]) => (
                    <TableRow key={path}>
                      <TableCell>
                        <Badge variant={method === "GET" ? "secondary" : "default"}>{method}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{path}</TableCell>
                      <TableCell className="text-muted-foreground">{desc}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Section>
        </RevealItem>

        <RevealItem>
          <Section id="base" title="7. Base de données Supabase">
            <p>
              Projet PostgreSQL hébergé chez <MedTerm id="supabase">Supabase</MedTerm>. Schéma versionné dans{" "}
              <code>supabase/migrations/001_init.sql</code>, <MedTerm id="rls">RLS</MedTerm> activée sur les trois tables avec des
              politiques de lecture et d'écriture pour la clé publique.
            </p>
            <Table>
              <TableBody>
                {TABLES.map(([name, desc]) => (
                  <TableRow key={name}>
                    <TableCell className="font-mono text-xs">{name}</TableCell>
                    <TableCell className="text-muted-foreground">{desc}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Section>
        </RevealItem>

        <RevealItem>
          <Section id="interface" title="8. Interface et animations">
            <ul className="list-disc space-y-1 pl-5">
              <li>
                Cœur 3D anatomique low-poly en arrière-plan translucide (Three.js, halo de Fresnel), qui bat au rythme du terme
                survolé : <MedTerm id="systole">systole</MedTerm>, <MedTerm id="diastole">diastole</MedTerm>, alerte. Il suit la souris
                et remonte quand on fait défiler la page.
              </li>
              <li>
                Réseau vasculaire animé : <MedTerm id="artere">artères</MedTerm> rouges, <MedTerm id="veine">veines</MedTerm> violettes,
                globules qui circulent à une vitesse liée au rythme. Au défilement, les vaisseaux descendent vers deux poumons
                stylisés.
              </li>
              <li>
                Tracé ECG de moniteur hospitalier (<MedTerm id="pqrst">ondes P, QRS, T</MedTerm>) dessiné sur canvas, synchronisé sur
                la même horloge cardiaque que le cœur et le son.
              </li>
              <li>
                Effets sonores synthétisés (Web Audio, aucun fichier) : lub-dub des valves, bip du moniteur au pic R, tic au survol,
                carillon au résultat. Coupés par défaut, bouton haut-parleur dans l'en-tête.
              </li>
              <li>
                Fenêtres explicatives : chaque terme souligné en pointillé ouvre une définition et change le rythme du cœur. Elles
                sont générées depuis le lexique de l'API ({"backend/src/atrium/lexicon.py"}).
              </li>
              <li>Apparitions lentes (motion), thème sombre ou clair, cartes en verre dépoli, accessibilité clavier et lecteur d'écran.</li>
            </ul>
          </Section>
        </RevealItem>

        <RevealItem>
          <Section id="lancer" title="9. Lancer le projet">
            <pre className="overflow-x-auto rounded-lg bg-muted p-3 font-mono text-xs leading-relaxed">
              {`git clone https://github.com/TheShellMaster/atrium
cd atrium
make dev            # API sur :8000 + interface sur :5173

# séparément
cd backend && uv sync && PYTHONPATH=src uv run uvicorn atrium.main:app --reload --app-dir src
cd frontend && npm install && npm run dev

# tests backend
cd backend && PYTHONPATH=src uv run pytest -q`}
            </pre>
            <p className="text-muted-foreground">
              Prérequis : Python 3.12 (uv), Node 22. Les fichiers UCI sont dans <code>backend/data/uci</code> ; le modèle s'entraîne
              tout seul au premier démarrage. Les clés Supabase sont lues dans <code>.env</code> (voir <code>.env.example</code>).
            </p>
          </Section>
        </RevealItem>

        <RevealItem>
          <Section id="demo" title="10. Déroulé de présentation (5 minutes)">
            <ol className="list-decimal space-y-1.5 pl-5">
              <li>
                <b>Tableau de bord</b> : activer le son, survoler « systole » puis « angor » — le cœur, l'ECG et le son changent.
              </li>
              <li>
                <b>Statistiques</b> : montrer les 4 hôpitaux, le déséquilibre des classes, un histogramme, les corrélations.
              </li>
              <li>
                <b>Modèle</b> : matrice de confusion (insister sur les faux négatifs), puis sigmoïde, puis ROC/AUC, puis régression
                linéaire âge → fréquence max pour comparer les deux régressions.
              </li>
              <li>
                <b>Examen</b> : charger l'exemple atteint, prédire, lire les contributions ; puis l'exemple préservé.
              </li>
              <li>
                <b>Registre</b> : la ligne est dans Supabase ; importer le fichier modèle CSV, exporter en Excel.
              </li>
            </ol>
          </Section>
        </RevealItem>

        <RevealItem>
          <Section id="credits" title="11. Crédits et licences">
            <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
              <li>Données : UCI Machine Learning Repository, Heart Disease (Janosi, Steinbrunn, Pfisterer, Detrano, 1988), CC BY 4.0.</li>
              <li>Cœur 3D : dérivé low-poly de « Realistic Human Heart » par neshallads (Sketchfab), CC BY 4.0 ; simplification gltf-transform.</li>
              <li>Interface : shadcn/ui, Radix, Tailwind CSS, recharts, motion, Three.js, lucide. Police Geist.</li>
              <li>Backend : FastAPI, scikit-learn, pandas, numpy, openpyxl. Base : Supabase.</li>
            </ul>
          </Section>
        </RevealItem>
      </RevealGroup>
    </>
  );
}
