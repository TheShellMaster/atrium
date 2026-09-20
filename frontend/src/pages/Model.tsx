import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ComposedChart, Line, LineChart, ReferenceLine, Scatter, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { ActivityIcon, CrosshairIcon, RefreshCwIcon, ShieldCheckIcon, TargetIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Field, FieldLabel } from "@/components/ui/field";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { PageHeader } from "@/components/PageHeader";
import { MedTerm } from "@/components/MedTerm";
import { StatCard, CountUp } from "@/components/StatCard";
import { Reveal, RevealGroup, RevealItem } from "@/components/Reveal";
import { useData } from "@/context/Data";
import { api } from "@/lib/api";
import { num, pct } from "@/lib/format";
import type { Catalog, ModelCard, Regression } from "@/lib/types";
import { cn } from "@/lib/utils";

const rocConfig: ChartConfig = {
  tpr: { label: "Sensibilité", color: "var(--color-risk)" },
  chance: { label: "Pile ou face", color: "var(--color-muted-foreground)" },
};

const coefConfig: ChartConfig = {
  coef: { label: "Coefficient", color: "var(--color-risk)" },
};

const sigmoidConfig: ChartConfig = {
  p: { label: "P(atteint)", color: "var(--color-primary)" },
  atteint: { label: "Patients atteints", color: "var(--color-risk)" },
  preserve: { label: "Patients préservés", color: "var(--color-safe)" },
};

const regressionConfig: ChartConfig = {
  atteint: { label: "Atteints", color: "var(--color-risk)" },
  preserve: { label: "Préservés", color: "var(--color-safe)" },
  droite: { label: "Droite ajustée", color: "var(--color-primary)" },
};

const NUMERIC_KEYS = ["age", "trestbps", "chol", "thalach", "oldpeak"];

function LinearRegressionPanel({ catalog }: { catalog: Catalog }) {
  const [x, setX] = useState("age");
  const [y, setY] = useState("thalach");
  const [reg, setReg] = useState<Regression | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (x === y) return;
    api
      .regression(x, y)
      .then((r) => {
        setReg(r);
        setError(null);
      })
      .catch((err: Error) => setError(err.message));
  }, [x, y]);

  const atteints = useMemo(() => reg?.points.filter((p) => p.target === 1) ?? [], [reg]);
  const preserves = useMemo(() => reg?.points.filter((p) => p.target === 0) ?? [], [reg]);
  const label = (key: string) => catalog.meta[key]?.label ?? key;

  return (
    <div className="grid gap-4 lg:grid-cols-5">
      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle>Régression linéaire</CardTitle>
          <CardDescription>
            Une <MedTerm id="lineaire">droite</MedTerm> y = a·x + b ajustée aux {reg?.n ?? "…"} patients par les moindres carrés.
            Chaque point est un patient réel.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="reg-x">Variable explicative (x)</FieldLabel>
              <Select value={x} onValueChange={setX}>
                <SelectTrigger id="reg-x" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {NUMERIC_KEYS.map((k) => (
                      <SelectItem key={k} value={k} disabled={k === y}>
                        {label(k)}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="reg-y">Variable expliquée (y)</FieldLabel>
              <Select value={y} onValueChange={setY}>
                <SelectTrigger id="reg-y" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {NUMERIC_KEYS.map((k) => (
                      <SelectItem key={k} value={k} disabled={k === x}>
                        {label(k)}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {reg ? (
            <ChartContainer config={regressionConfig} className="aspect-auto h-[360px] w-full">
              <ComposedChart margin={{ left: 8, right: 16, top: 8, bottom: 8 }}>
                <CartesianGrid />
                <XAxis
                  type="number"
                  dataKey="x"
                  name={reg.x_label}
                  domain={["dataMin", "dataMax"]}
                  tickFormatter={(v: number) => v.toFixed(0)}
                  label={{ value: `${reg.x_label}${reg.x_unit ? ` (${reg.x_unit})` : ""}`, position: "insideBottom", offset: -4, className: "fill-muted-foreground" }}
                />
                <YAxis
                  type="number"
                  dataKey="y"
                  name={reg.y_label}
                  domain={["auto", "auto"]}
                  tickFormatter={(v: number) => v.toFixed(0)}
                  label={{ value: `${reg.y_label}${reg.y_unit ? ` (${reg.y_unit})` : ""}`, angle: -90, position: "insideLeft", className: "fill-muted-foreground" }}
                />
                <ChartTooltip cursor={{ strokeDasharray: "3 3" }} content={<ChartTooltipContent hideLabel />} />
                <Scatter name="preserve" data={preserves} fill="var(--color-preserve)" fillOpacity={0.55} isAnimationActive={false} />
                <Scatter name="atteint" data={atteints} fill="var(--color-atteint)" fillOpacity={0.55} isAnimationActive={false} />
                <Scatter
                  name="droite"
                  data={reg.line}
                  fill="transparent"
                  line={{ stroke: "var(--color-droite)", strokeWidth: 2.5 }}
                  shape={() => <g />}
                  isAnimationActive={false}
                />
              </ComposedChart>
            </ChartContainer>
          ) : (
            <Skeleton className="h-[360px]" />
          )}
        </CardContent>
      </Card>
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Lecture de la droite</CardTitle>
          <CardDescription>{reg?.equation ?? "…"}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          {reg ? (
            <>
              <div className="flex items-start justify-between gap-3 border-b pb-3">
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium"><MedTerm id="pente">Pente</MedTerm> a</span>
                  <span className="text-xs text-muted-foreground">variation de y quand x augmente de 1</span>
                </div>
                <span className="whitespace-nowrap text-lg font-semibold tabular-nums">{num(reg.slope, 3)}</span>
              </div>
              <div className="flex items-start justify-between gap-3 border-b pb-3">
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium">Ordonnée à l'origine b</span>
                  <span className="text-xs text-muted-foreground">valeur de y quand x = 0</span>
                </div>
                <span className="whitespace-nowrap text-lg font-semibold tabular-nums">{num(reg.intercept, 2)}</span>
              </div>
              <div className="flex items-start justify-between gap-3 border-b pb-3">
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium"><MedTerm id="correlation">Corrélation</MedTerm> r</span>
                  <span className="text-xs text-muted-foreground">force et sens du lien linéaire</span>
                </div>
                <span className="whitespace-nowrap text-lg font-semibold tabular-nums">{num(reg.r, 3)}</span>
              </div>
              <div className="flex items-start justify-between gap-3 border-b pb-3">
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium"><MedTerm id="r2">R²</MedTerm></span>
                  <span className="text-xs text-muted-foreground">part de la variation expliquée</span>
                </div>
                <span className="whitespace-nowrap text-lg font-semibold tabular-nums">{pct(reg.r2)}</span>
              </div>
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium"><MedTerm id="rmse">RMSE</MedTerm></span>
                  <span className="text-xs text-muted-foreground">erreur moyenne de la droite{reg.y_unit ? ` (${reg.y_unit})` : ""}</span>
                </div>
                <span className="whitespace-nowrap text-lg font-semibold tabular-nums">{num(reg.rmse, 2)}</span>
              </div>
              <p className="pt-2 text-xs text-muted-foreground">
                La régression linéaire prédit une valeur continue. Pour prédire un oui/non (atteint ou non), on passe à la{" "}
                <MedTerm id="regression">régression logistique</MedTerm> : même score linéaire, mais écrasé par la{" "}
                <MedTerm id="sigmoide">sigmoïde</MedTerm>.
              </p>
            </>
          ) : (
            <Skeleton className="h-64" />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SigmoidPanel({ model }: { model: ModelCard }) {
  const atteints = useMemo(() => model.sigmoid.patients.filter((p) => p.y === 1), [model]);
  const preserves = useMemo(() => model.sigmoid.patients.filter((p) => p.y === 0), [model]);
  return (
    <div className="grid gap-4 lg:grid-cols-5">
      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle>La sigmoïde</CardTitle>
          <CardDescription>
            P = 1 / (1 + e⁻ᶻ). Chaque point est un patient du jeu de test placé selon son <MedTerm id="logit">score z</MedTerm> ;
            sa hauteur est la probabilité que le modèle lui attribue.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={sigmoidConfig} className="aspect-auto h-[360px] w-full">
            <ComposedChart data={model.sigmoid.curve} margin={{ left: 8, right: 16, top: 8, bottom: 8 }}>
              <CartesianGrid />
              <XAxis
                type="number"
                dataKey="z"
                domain={[-6, 6]}
                tickFormatter={(v: number) => v.toFixed(0)}
                label={{ value: "score z = b₀ + Σ bᵢ·xᵢ", position: "insideBottom", offset: -4, className: "fill-muted-foreground" }}
              />
              <YAxis
                type="number"
                dataKey="p"
                domain={[0, 1]}
                tickFormatter={(v: number) => v.toFixed(1)}
                label={{ value: "probabilité", angle: -90, position: "insideLeft", className: "fill-muted-foreground" }}
              />
              <ChartTooltip content={<ChartTooltipContent hideLabel />} />
              <ReferenceLine y={0.5} stroke="var(--color-muted-foreground)" strokeDasharray="4 4" label={{ value: "seuil 0,5", position: "insideTopLeft", className: "fill-muted-foreground", fontSize: 11 }} />
              <ReferenceLine x={0} stroke="var(--color-muted-foreground)" strokeDasharray="4 4" />
              <Scatter name="preserve" data={preserves} fill="var(--color-preserve)" fillOpacity={0.7} isAnimationActive={false} />
              <Scatter name="atteint" data={atteints} fill="var(--color-atteint)" fillOpacity={0.7} isAnimationActive={false} />
              <Line type="monotone" dataKey="p" stroke="var(--color-p)" strokeWidth={2.5} dot={false} animationDuration={1600} />
            </ComposedChart>
          </ChartContainer>
        </CardContent>
      </Card>
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Pourquoi une courbe en S ?</CardTitle>
          <CardDescription>Trois propriétés qui font tout le modèle.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 text-sm">
          <div className="flex flex-col gap-1">
            <span className="font-medium">Elle borne le score</span>
            <p className="text-muted-foreground">
              Le <MedTerm id="logit">score z</MedTerm> peut valoir −8 ou +12 ; la <MedTerm id="sigmoide">sigmoïde</MedTerm> le
              ramène toujours entre 0 et 1, donc lisible comme une probabilité.
            </p>
          </div>
          <div className="flex flex-col gap-1">
            <span className="font-medium">z = 0 vaut exactement 0,5</span>
            <p className="text-muted-foreground">
              Le <MedTerm id="seuil">seuil</MedTerm> de décision 0,5 correspond au point où les poids pour et contre s'annulent.
              Déplacer le seuil, c'est déplacer la ligne pointillée.
            </p>
          </div>
          <div className="flex flex-col gap-1">
            <span className="font-medium">Les erreurs se voient</span>
            <p className="text-muted-foreground">
              Un point rouge sous la ligne pointillée est un <MedTerm id="fn">faux négatif</MedTerm> ; un point vert au-dessus,
              un <MedTerm id="fp">faux positif</MedTerm>. Plus les couleurs se séparent, meilleur est le modèle.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 pt-2">
            <div className="rounded-lg bg-risk/15 p-3 text-risk">
              <div className="text-xs opacity-80">atteints (test)</div>
              <div className="text-2xl font-semibold tabular-nums">{atteints.length}</div>
            </div>
            <div className="rounded-lg bg-safe/15 p-3 text-safe">
              <div className="text-xs opacity-80">préservés (test)</div>
              <div className="text-2xl font-semibold tabular-nums">{preserves.length}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function humanize(name: string, catalog: Catalog | null): string {
  if (!catalog) return name;
  if (name.startsWith("num__")) {
    const key = name.slice(5);
    return catalog.meta[key]?.label ?? key;
  }
  if (name.startsWith("cat__")) {
    const rest = name.slice(5);
    const idx = rest.lastIndexOf("_");
    const key = rest.slice(0, idx);
    const code = Number(rest.slice(idx + 1));
    const label = catalog.meta[key]?.label ?? key;
    const choice = catalog.choices[key]?.find(([c]) => c === code)?.[1];
    return choice ? `${label} · ${choice}` : `${label} = ${code}`;
  }
  return name;
}

function ConfusionMatrix({ model }: { model: ModelCard }) {
  const cells = [
    { key: "vp", title: "Vrais positifs", value: model.vp, text: "Malades bien détectés", tone: "bg-safe/15 text-safe ring-safe/30" },
    { key: "fn", title: "Faux négatifs", value: model.fn, text: "Malades rassurés à tort — l'erreur la plus grave", tone: "bg-risk/15 text-risk ring-risk/40" },
    { key: "fp", title: "Faux positifs", value: model.fp, text: "Sains alarmés à tort", tone: "bg-warn/20 text-warn ring-warn/30" },
    { key: "vn", title: "Vrais négatifs", value: model.vn, text: "Sains bien rassurés", tone: "bg-muted text-foreground ring-border" },
  ];
  return (
    <div className="grid grid-cols-[auto_1fr_1fr] gap-2 text-sm">
      <div />
      <div className="text-center text-xs font-medium text-muted-foreground">Prédit atteint</div>
      <div className="text-center text-xs font-medium text-muted-foreground">Prédit préservé</div>
      <div className="flex items-center text-xs font-medium text-muted-foreground [writing-mode:vertical-rl] rotate-180">Réellement atteint</div>
      {cells.slice(0, 2).map((cell) => (
        <div key={cell.key} className={cn("flex flex-col gap-1 rounded-lg p-4 ring-1", cell.tone)}>
          <span className="text-xs font-medium opacity-80">{cell.title}</span>
          <span className="text-4xl font-semibold tabular-nums">
            <CountUp value={cell.value} />
          </span>
          <span className="text-xs opacity-80">{cell.text}</span>
        </div>
      ))}
      <div className="flex items-center text-xs font-medium text-muted-foreground [writing-mode:vertical-rl] rotate-180">Réellement préservé</div>
      {cells.slice(2).map((cell) => (
        <div key={cell.key} className={cn("flex flex-col gap-1 rounded-lg p-4 ring-1", cell.tone)}>
          <span className="text-xs font-medium opacity-80">{cell.title}</span>
          <span className="text-4xl font-semibold tabular-nums">
            <CountUp value={cell.value} />
          </span>
          <span className="text-xs opacity-80">{cell.text}</span>
        </div>
      ))}
    </div>
  );
}

export function Model() {
  const { model, catalog, reload } = useData();
  const [training, setTraining] = useState(false);

  const roc = useMemo(
    () => (model ? model.roc.fpr.map((x, i) => ({ fpr: Number(x.toFixed(4)), tpr: Number(model.roc.tpr[i].toFixed(4)), chance: Number(x.toFixed(4)) })) : []),
    [model],
  );
  const coefs = useMemo(
    () => (model ? model.coefficients.slice(0, 14).map((c) => ({ name: humanize(c.name, catalog), coef: Number(c.coef.toFixed(3)) })) : []),
    [model, catalog],
  );

  if (!model || !catalog) {
    return (
      <>
        <PageHeader title="Modèle et métriques" description="Chargement du modèle…" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-[420px]" />
      </>
    );
  }

  const retrain = async () => {
    setTraining(true);
    try {
      const report = await api.retrain();
      toast.success("Modèle ré-entraîné", { description: `Exactitude ${pct(report.accuracy)} · AUC ${num(report.auc, 3)}` });
      reload();
    } catch (err) {
      toast.error("Entraînement impossible", { description: err instanceof Error ? err.message : undefined });
    } finally {
      setTraining(false);
    }
  };

  const formula = (id: string) => catalog.formulas.find((f) => f.id === id);
  const derived = [
    { id: "accuracy", value: model.accuracy },
    { id: "precision", value: model.precision },
    { id: "recall", value: model.recall },
    { id: "f1", value: model.f1 },
  ];

  return (
    <>
      <Reveal>
        <PageHeader
          title="Modèle et métriques"
          description={`${model.dataset}. ${model.n_train} patients pour apprendre, ${model.n_test} pour tester : le modèle n'est évalué que sur des dossiers qu'il n'a jamais vus.`}
          actions={
            <Button variant="outline" onClick={retrain} disabled={training}>
              <RefreshCwIcon data-icon="inline-start" className={training ? "animate-spin" : undefined} />
              {training ? "Entraînement…" : "Ré-entraîner"}
            </Button>
          }
        />
      </Reveal>

      <RevealGroup className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <RevealItem>
          <StatCard
            label="Exactitude"
            value={model.accuracy * 100}
            format={(v) => v.toFixed(1)}
            suffix="%"
            icon={TargetIcon}
            hint={model.cv ? `Validation croisée ${model.cv.folds} plis : ${pct(model.cv.accuracy_mean)} ± ${pct(model.cv.accuracy_std)}` : "(VP + VN) / total"}
            badge={`F1 ${pct(model.f1)}`}
          />
        </RevealItem>
        <RevealItem>
          <StatCard label="Précision" value={model.precision * 100} format={(v) => v.toFixed(1)} suffix="%" icon={ActivityIcon} hint="VP / (VP + FP)" />
        </RevealItem>
        <RevealItem>
          <StatCard label="Sensibilité" value={model.recall * 100} format={(v) => v.toFixed(1)} suffix="%" icon={CrosshairIcon} tone="risk" hint="VP / (VP + FN) · rappel" />
        </RevealItem>
        <RevealItem>
          <StatCard
            label="Spécificité"
            value={model.specificity * 100}
            format={(v) => v.toFixed(1)}
            suffix="%"
            icon={ShieldCheckIcon}
            tone="safe"
            hint={model.cv ? `AUC en validation croisée : ${num(model.cv.auc_mean, 3)} ± ${num(model.cv.auc_std, 3)}` : "VN / (VN + FP)"}
            badge={`AUC ${num(model.auc, 3)}`}
          />
        </RevealItem>
      </RevealGroup>

      <Reveal delay={0.1}>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="outline">{model.n_reference} patients de référence (UCI)</Badge>
          <Badge variant={model.n_registry > 0 ? "default" : "outline"}>
            {model.n_registry} dossier{model.n_registry > 1 ? "s" : ""} Atrium confirmé{model.n_registry > 1 ? "s" : ""} dans l'apprentissage
          </Badge>
          {model.trained_at ? <span>Dernier entraînement : {new Date(model.trained_at).toLocaleString("fr-FR")}</span> : null}
          <span>
            Chaque <MedTerm id="train_test">dossier confirmé</MedTerm> ré-entraîne le modèle : les comptes et les métriques s'affinent.
          </span>
        </div>
      </Reveal>

      <Reveal delay={0.15}>
        <Tabs defaultValue="confusion" className="gap-4">
          <TabsList className="h-auto flex-wrap">
            <TabsTrigger value="confusion">Matrice de confusion</TabsTrigger>
            <TabsTrigger value="sigmoid">Sigmoïde</TabsTrigger>
            <TabsTrigger value="roc">Courbe ROC</TabsTrigger>
            <TabsTrigger value="coefs">Coefficients</TabsTrigger>
            <TabsTrigger value="linear">Régression linéaire</TabsTrigger>
            <TabsTrigger value="formulas">Formules du cours</TabsTrigger>
            <TabsTrigger value="data">Données</TabsTrigger>
          </TabsList>

          <TabsContent value="sigmoid">
            <SigmoidPanel model={model} />
          </TabsContent>

          <TabsContent value="linear">
            <LinearRegressionPanel catalog={catalog} />
          </TabsContent>

          <TabsContent value="confusion">
            <div className="grid gap-4 lg:grid-cols-5">
              <Card className="lg:col-span-3">
                <CardHeader>
                  <CardTitle>Matrice de confusion</CardTitle>
                  <CardDescription>
                    Sur les {model.n_test} patients du jeu de test. Un <MedTerm id="vp">vrai positif</MedTerm> est un malade bien
                    détecté ; un <MedTerm id="fn">faux négatif</MedTerm> est un malade rassuré à tort.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ConfusionMatrix model={model} />
                </CardContent>
              </Card>
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Métriques dérivées</CardTitle>
                  <CardDescription>Toutes se lisent dans les quatre cases, au <MedTerm id="seuil">seuil</MedTerm> {model.threshold}.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  {derived.map(({ id, value }) => {
                    const f = formula(id);
                    return (
                      <div key={id} className="flex items-start justify-between gap-3 border-b pb-3 last:border-0 last:pb-0">
                        <div className="flex flex-col gap-1">
                          <span className="text-sm font-medium">{f?.title ?? id}</span>
                          <code className="text-xs text-muted-foreground">{f?.latex}</code>
                        </div>
                        <span className="whitespace-nowrap text-lg font-semibold tabular-nums">{pct(value)}</span>
                      </div>
                    );
                  })}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-medium">Spécificité</span>
                      <code className="text-xs text-muted-foreground">VN / (VN + FP)</code>
                    </div>
                    <span className="whitespace-nowrap text-lg font-semibold tabular-nums">{pct(model.specificity)}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="roc">
            <div className="grid gap-4 lg:grid-cols-5">
              <Card className="lg:col-span-3">
                <CardHeader>
                  <CardTitle>Courbe ROC</CardTitle>
                  <CardDescription>Sensibilité en fonction du taux de faux positifs, pour tous les seuils possibles.</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={rocConfig} className="aspect-auto h-[340px] w-full">
                    <LineChart data={roc} margin={{ left: 8, right: 16, top: 8, bottom: 8 }}>
                      <CartesianGrid />
                      <XAxis
                        dataKey="fpr"
                        type="number"
                        domain={[0, 1]}
                        tickFormatter={(v: number) => v.toFixed(1)}
                        label={{ value: "1 − spécificité (faux positifs)", position: "insideBottom", offset: -4, className: "fill-muted-foreground" }}
                      />
                      <YAxis
                        type="number"
                        domain={[0, 1]}
                        tickFormatter={(v: number) => v.toFixed(1)}
                        label={{ value: "Sensibilité", angle: -90, position: "insideLeft", className: "fill-muted-foreground" }}
                      />
                      <ChartTooltip content={<ChartTooltipContent labelFormatter={(v) => `Faux positifs ${Number(v).toFixed(2)}`} />} />
                      <Line type="linear" dataKey="chance" stroke="var(--color-chance)" strokeDasharray="4 4" dot={false} strokeWidth={1} isAnimationActive={false} />
                      <Line type="stepAfter" dataKey="tpr" stroke="var(--color-tpr)" strokeWidth={2.5} dot={false} animationDuration={1600} />
                    </LineChart>
                  </ChartContainer>
                </CardContent>
              </Card>
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Aire sous la courbe</CardTitle>
                  <CardDescription>{formula("auc")?.latex}</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <div className="text-6xl font-semibold tracking-tight tabular-nums">
                    <CountUp value={model.auc} format={(v) => v.toFixed(3)} />
                  </div>
                  <p className="text-sm text-muted-foreground">{formula("auc")?.plain}</p>
                  <div className="flex flex-col gap-2 text-sm">
                    <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2">
                      <span>1.000</span>
                      <span className="text-muted-foreground">modèle parfait</span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-risk/15 px-3 py-2 text-risk ring-1 ring-risk/30">
                      <span className="font-medium">{num(model.auc, 3)}</span>
                      <span>Atrium</span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2">
                      <span>0.500</span>
                      <span className="text-muted-foreground">pile ou face</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="coefs">
            <Card>
              <CardHeader>
                <CardTitle>Coefficients appris</CardTitle>
                <CardDescription>
                  Les variables numériques sont standardisées (centrées-réduites), les catégorielles encodées en one-hot : les
                  coefficients se lisent sur le score z. Ordonnée à l'origine b₀ = {num(model.intercept, 3)}.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <ChartContainer config={coefConfig} className="aspect-auto h-[460px] w-full">
                  <BarChart data={coefs} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
                    <CartesianGrid horizontal={false} />
                    <XAxis type="number" tickLine={false} axisLine={false} tickFormatter={(v: number) => v.toFixed(1)} />
                    <YAxis type="category" dataKey="name" width={210} tickLine={false} axisLine={false} />
                    <ChartTooltip cursor={false} content={<ChartTooltipContent hideIndicator />} />
                    <Bar dataKey="coef" radius={4} animationDuration={1400}>
                      {coefs.map((row) => (
                        <Cell key={row.name} fill={row.coef >= 0 ? "var(--color-risk)" : "var(--color-safe)"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ChartContainer>
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <Badge className="bg-risk/15 text-risk">coefficient positif → pousse vers « atteint »</Badge>
                  <Badge className="bg-safe/15 text-safe">coefficient négatif → pousse vers « préservé »</Badge>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="formulas">
            <div className="grid gap-4 md:grid-cols-2">
              {catalog.formulas.map((f) => (
                <Card key={f.id} size="sm">
                  <CardHeader>
                    <CardTitle>{f.title}</CardTitle>
                    <CardDescription>
                      <code className="font-mono text-foreground">{f.latex}</code>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">{f.plain}</CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="data">
            <Card>
              <CardHeader>
                <CardTitle>Aperçu des données</CardTitle>
                <CardDescription>
                  Les huit premières lignes du fichier UCI Cleveland ({model.n_total} patients). La colonne cible vaut 1 si le
                  patient est atteint.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {catalog.features.map((f) => (
                          <TableHead key={f} className="whitespace-nowrap">
                            {catalog.meta[f]?.label ?? f}
                          </TableHead>
                        ))}
                        <TableHead>Cible</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {model.preview.map((row, i) => (
                        <TableRow key={i}>
                          {catalog.features.map((f) => (
                            <TableCell key={f} className="tabular-nums">
                              {row[f]}
                            </TableCell>
                          ))}
                          <TableCell>
                            <Badge variant={row.target === 1 ? "destructive" : "secondary"}>{row.target === 1 ? "Atteint" : "Préservé"}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </Reveal>
    </>
  );
}
