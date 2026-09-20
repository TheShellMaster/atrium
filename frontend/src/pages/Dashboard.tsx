import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ActivityIcon, ArrowRightIcon, CrosshairIcon, ShieldCheckIcon, StethoscopeIcon, TargetIcon } from "lucide-react";
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MedTerm } from "@/components/MedTerm";
import { StatCard } from "@/components/StatCard";
import { PageHeader } from "@/components/PageHeader";
import { EcgLine } from "@/components/EcgLine";
import { Reveal, RevealGroup, RevealItem } from "@/components/Reveal";
import { useCabinet } from "@/context/Cabinet";
import { useData } from "@/context/Data";
import { api } from "@/lib/api";
import { dateFr, pct } from "@/lib/format";
import type { PatientRow } from "@/lib/types";
import { cn } from "@/lib/utils";

const MOOD_TEXT = {
  idle: { label: "Rythme de repos", bpm: 62 },
  contract: { label: "Systole", bpm: 96 },
  expand: { label: "Diastole", bpm: 44 },
  warn: { label: "Alerte", bpm: 128 },
} as const;

function ConfusionMini() {
  const { model } = useData();
  if (!model) return <Skeleton className="h-40 w-full" />;
  const cells = [
    { key: "vp", label: "Vrais positifs", value: model.vp, tone: "bg-safe/15 text-safe" },
    { key: "fn", label: "Faux négatifs", value: model.fn, tone: "bg-risk/15 text-risk" },
    { key: "fp", label: "Faux positifs", value: model.fp, tone: "bg-warn/20 text-warn" },
    { key: "vn", label: "Vrais négatifs", value: model.vn, tone: "bg-muted text-foreground" },
  ];
  return (
    <div className="grid grid-cols-2 gap-2">
      {cells.map((cell) => (
        <div key={cell.key} className={cn("flex flex-col gap-1 rounded-lg p-3", cell.tone)}>
          <span className="text-xs font-medium opacity-80">{cell.label}</span>
          <span className="text-2xl font-semibold tabular-nums">{cell.value}</span>
        </div>
      ))}
    </div>
  );
}

function RecentPatients() {
  const [rows, setRows] = useState<PatientRow[] | null>(null);
  useEffect(() => {
    api
      .patients()
      .then((data) => setRows(data.items.slice(0, 5)))
      .catch(() => setRows([]));
  }, []);

  if (rows === null) return <Skeleton className="h-40 w-full" />;
  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Aucun dossier pour le moment. Le premier examen écrira la première ligne dans Supabase.
      </p>
    );
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Dossier</TableHead>
          <TableHead>Âge</TableHead>
          <TableHead>Lecture</TableHead>
          <TableHead className="text-right">Probabilité</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id}>
            <TableCell className="font-medium">
              <div className="flex flex-col">
                <span>{row.full_name || "Anonyme"}</span>
                <span className="text-xs text-muted-foreground">{dateFr(row.created_at)}</span>
              </div>
            </TableCell>
            <TableCell>{row.age}</TableCell>
            <TableCell>
              <Badge variant={row.predicted_label ? "destructive" : "secondary"}>
                {row.predicted_label ? "Atteint" : "Préservé"}
              </Badge>
            </TableCell>
            <TableCell className="text-right tabular-nums">{pct(Number(row.predicted_proba))}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function Dashboard() {
  const { model } = useData();
  const { mood } = useCabinet();
  const rhythm = MOOD_TEXT[mood];

  return (
    <>
      <Reveal>
        <PageHeader
          title="Tableau de bord"
          description={
            <>
              Lecture du risque cardiovasculaire sur {model?.n_total ?? "…"} patients réels (<MedTerm id="uci">UCI</MedTerm>, 4
              hôpitaux). Une <MedTerm id="regression">régression logistique</MedTerm> transforme 13 variables cliniques en
              probabilité d'accident.
            </>
          }
          actions={
            <>
              <Button asChild>
                <Link to="/examen">
                  <StethoscopeIcon data-icon="inline-start" />
                  Nouvel examen
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/modele">
                  Voir le modèle
                  <ArrowRightIcon data-icon="inline-end" />
                </Link>
              </Button>
            </>
          }
        />
      </Reveal>

      <RevealGroup className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <RevealItem>
          <StatCard
            label="Exactitude"
            value={(model?.accuracy ?? 0) * 100}
            format={(v) => v.toFixed(1)}
            suffix="%"
            icon={TargetIcon}
            hint="Prédictions justes sur le jeu de test"
            badge={model ? `${model.n_test} patients test` : undefined}
          />
        </RevealItem>
        <RevealItem>
          <StatCard
            label="Sensibilité"
            value={(model?.recall ?? 0) * 100}
            format={(v) => v.toFixed(1)}
            suffix="%"
            icon={CrosshairIcon}
            tone="risk"
            hint="Malades détectés · VP / (VP + FN)"
          />
        </RevealItem>
        <RevealItem>
          <StatCard
            label="Spécificité"
            value={(model?.specificity ?? 0) * 100}
            format={(v) => v.toFixed(1)}
            suffix="%"
            icon={ShieldCheckIcon}
            tone="safe"
            hint="Sains reconnus · VN / (VN + FP)"
          />
        </RevealItem>
        <RevealItem>
          <StatCard
            label="AUC ROC"
            value={model?.auc ?? 0}
            format={(v) => v.toFixed(3)}
            icon={ActivityIcon}
            hint="1.0 = parfait · 0.5 = pile ou face"
          />
        </RevealItem>
      </RevealGroup>

      <RevealGroup className="grid gap-4 lg:grid-cols-3" stagger={0.12}>
        <RevealItem>
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Le cœur sous observation</CardTitle>
              <CardDescription>
                Survole <MedTerm id="systole">la systole</MedTerm>, <MedTerm id="diastole">la diastole</MedTerm> ou{" "}
                <MedTerm id="angor">l'angor</MedTerm> : le cœur en arrière-plan change de rythme.
              </CardDescription>
              <CardAction>
                <Badge variant={mood === "warn" ? "destructive" : "outline"} className="gap-1.5">
                  <ActivityIcon />
                  {rhythm.bpm} bpm
                </Badge>
              </CardAction>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-4">
              <div className="flex items-end justify-between gap-3">
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground">État</span>
                  <span className={cn("text-lg font-medium", mood === "warn" ? "text-risk" : "text-foreground")}>{rhythm.label}</span>
                </div>
                <span className="text-xs text-muted-foreground">60 / {rhythm.bpm} s par battement</span>
              </div>
              <EcgLine className="h-10" />
              <ul className="flex flex-col gap-2 text-xs text-muted-foreground">
                <li className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-risk" />
                  Artères : sang oxygéné qui quitte le cœur
                </li>
                <li className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-chart-5" />
                  Veines : retour du sang vers le cœur
                </li>
                <li className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-foreground/70" />
                  Globules : la vitesse suit le rythme cardiaque
                </li>
              </ul>
            </CardContent>
            <CardFooter className="py-2 text-xs text-muted-foreground">
              Modèle 3D « Realistic Human Heart » (CC BY 4.0), rendu translucide.
            </CardFooter>
          </Card>
        </RevealItem>

        <RevealItem>
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Matrice de confusion</CardTitle>
              <CardDescription>
                Le <MedTerm id="fn">faux négatif</MedTerm> est l'erreur la plus grave : un malade rassuré à tort.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ConfusionMini />
            </CardContent>
            <CardFooter className="justify-end py-2">
              <Button variant="ghost" size="sm" asChild>
                <Link to="/modele">
                  Détail des métriques
                  <ArrowRightIcon data-icon="inline-end" />
                </Link>
              </Button>
            </CardFooter>
          </Card>
        </RevealItem>
        <div className="hidden lg:block" aria-hidden="true" />
      </RevealGroup>

      <RevealGroup className="grid gap-4 lg:grid-cols-3" stagger={0.12}>
        <RevealItem>
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Comment lire une prédiction</CardTitle>
              <CardDescription>Trois étapes, toujours dans le même ordre.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 text-sm">
              <ol className="flex flex-col gap-3">
                <li className="flex gap-3">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                    1
                  </span>
                  <span>
                    Un score linéaire <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">z = b₀ + Σ bᵢ·xᵢ</code>{" "}
                    combine âge, <MedTerm id="cholesterol">cholestérol</MedTerm>, <MedTerm id="hypertension">tension</MedTerm>{" "}
                    et tracé <MedTerm id="ecg">ECG</MedTerm>.
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                    2
                  </span>
                  <span>
                    La sigmoïde <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">P = 1 / (1 + e⁻ᶻ)</code>{" "}
                    ramène ce score entre 0 et 1 : une probabilité.
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                    3
                  </span>
                  <span>
                    Le <MedTerm id="seuil">seuil</MedTerm> 0.5 tranche : atteint ou préservé. On peut le baisser pour rater
                    moins de malades.
                  </span>
                </li>
              </ol>
            </CardContent>
          </Card>
        </RevealItem>

        <RevealItem>
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Derniers dossiers</CardTitle>
              <CardDescription>Chaque examen est une ligne dans Supabase.</CardDescription>
              <CardAction>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/patients">Registre</Link>
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent>
              <RecentPatients />
            </CardContent>
          </Card>
        </RevealItem>
      </RevealGroup>
    </>
  );
}
