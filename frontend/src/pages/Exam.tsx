import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { CloudIcon, DatabaseIcon, HeartPulseIcon, RotateCcwIcon, UserCheckIcon, UserXIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { PageHeader } from "@/components/PageHeader";
import { MedTerm } from "@/components/MedTerm";
import { TicketDialog, ticketFromPrediction } from "@/components/ConsultationTicket";
import { EcgLine } from "@/components/EcgLine";
import { CountUp } from "@/components/StatCard";
import { Reveal } from "@/components/Reveal";
import { useCabinet } from "@/context/Cabinet";
import { useData } from "@/context/Data";
import { api } from "@/lib/api";
import { audio } from "@/lib/audio";
import { num, riskTone } from "@/lib/format";
import type { Prediction } from "@/lib/types";
import { cn } from "@/lib/utils";

const BOUNDS: Record<string, [number, number, number]> = {
  age: [18, 100, 1],
  trestbps: [80, 220, 1],
  chol: [100, 600, 1],
  thalach: [60, 220, 1],
  oldpeak: [0, 7, 0.1],
};

const GROUPS = [
  { legend: "Identité", keys: ["age", "sex"] },
  { legend: "Symptômes", keys: ["cp", "exang"] },
  { legend: "Signes vitaux", keys: ["trestbps", "chol", "fbs"] },
  { legend: "ECG et effort", keys: ["restecg", "thalach", "oldpeak", "slope"] },
  { legend: "Examens complémentaires", keys: ["ca", "thal"] },
];

/** Deux vrais patients de la Cleveland Clinic (lignes 2 et 5 du fichier UCI). */
const EXAMPLES = {
  positive: { age: 67, sex: 1, cp: 3, trestbps: 160, chol: 286, fbs: 0, restecg: 2, thalach: 108, exang: 1, oldpeak: 1.5, slope: 1, ca: 3, thal: 1 },
  negative: { age: 41, sex: 0, cp: 1, trestbps: 130, chol: 204, fbs: 0, restecg: 2, thalach: 172, exang: 0, oldpeak: 1.4, slope: 0, ca: 0, thal: 1 },
};

const TONE_TEXT = { safe: "text-safe", warn: "text-warn", risk: "text-risk" } as const;
const TONE_BADGE = { safe: "bg-safe/15 text-safe", warn: "bg-warn/20 text-warn", risk: "bg-risk/15 text-risk" } as const;

const chartConfig: ChartConfig = {
  contribution: { label: "Contribution au score", color: "var(--color-risk)" },
};

export function Exam() {
  const { catalog, reload } = useData();
  const { setMood } = useCabinet();
  const [values, setValues] = useState<Record<string, number>>({});
  const [name, setName] = useState("");
  const [diagnosis, setDiagnosis] = useState<"unknown" | "0" | "1">("unknown");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Prediction | null>(null);

  useEffect(() => {
    if (catalog) setValues(catalog.defaults);
  }, [catalog]);

  const rows = useMemo(
    () => (result ? result.contributions.slice(0, 8).map((c) => ({ ...c, contribution: Number(c.contribution.toFixed(3)) })) : []),
    [result],
  );

  if (!catalog) {
    return (
      <>
        <PageHeader title="Examen d'un patient" description="Préparation de la feuille d'examen…" />
        <div className="grid gap-4 lg:grid-cols-5">
          <Skeleton className="h-[520px] lg:col-span-3" />
          <Skeleton className="h-[320px] lg:col-span-2" />
        </div>
      </>
    );
  }

  const set = (key: string, value: number) => setValues((prev) => ({ ...prev, [key]: value }));

  const reset = () => {
    setValues(catalog.defaults);
    setName("");
    setDiagnosis("unknown");
    setResult(null);
    setError(null);
    setMood("idle");
  };

  const load = (example: keyof typeof EXAMPLES) => {
    setValues(EXAMPLES[example]);
    setName(example === "positive" ? "Patient 2 · Cleveland" : "Patiente 5 · Cleveland");
    setResult(null);
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
        actual_label: diagnosis === "unknown" ? null : Number(diagnosis),
      });
      setResult(prediction);
      setMood(prediction.label === 1 ? "warn" : "expand");
      audio.chime(prediction.label === 1 ? "risk" : "safe");
      const store = prediction.patient?.store === "supabase" ? "Supabase" : "la copie locale";
      toast.success(`Dossier enregistré dans ${store}`, {
        description: `Probabilité ${(prediction.probability * 100).toFixed(1)} % · risque ${prediction.risk}`,
      });
      if (prediction.learning) {
        toast.info("Le modèle apprend de ce dossier", {
          description: "Diagnostic confirmé : ré-entraînement en cours, les comptes et les métriques se mettent à jour.",
        });
        window.setTimeout(reload, 8000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Prédiction impossible");
    } finally {
      setBusy(false);
    }
  };

  const tone = result ? riskTone(result.risk) : "safe";

  return (
    <>
      <Reveal>
        <PageHeader
          title="Examen d'un patient"
          description={
            <>
              Treize variables du jeu <MedTerm id="uci">UCI</MedTerm>. La <MedTerm id="regression">régression logistique</MedTerm>{" "}
              calcule un <MedTerm id="logit">score z</MedTerm>, la <MedTerm id="sigmoide">sigmoïde</MedTerm> le transforme en
              probabilité, le <MedTerm id="seuil">seuil</MedTerm> tranche.
            </>
          }
          actions={
            <>
              <Button variant="outline" size="sm" onClick={() => load("positive")}>
                <UserXIcon data-icon="inline-start" />
                Exemple atteint
              </Button>
              <Button variant="outline" size="sm" onClick={() => load("negative")}>
                <UserCheckIcon data-icon="inline-start" />
                Exemple préservé
              </Button>
              <Button variant="ghost" size="sm" onClick={reset}>
                <RotateCcwIcon data-icon="inline-start" />
                Réinitialiser
              </Button>
            </>
          }
        />
      </Reveal>

      <div className="grid items-start gap-4 lg:grid-cols-5">
        <Reveal delay={0.08} className="lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle>Feuille d'examen</CardTitle>
              <CardDescription>Chaque valeur est une variable du modèle. Les libellés suivent le codage UCI.</CardDescription>
            </CardHeader>
            <CardContent>
              <form id="exam-form" onSubmit={submit}>
                <FieldGroup>
                  <div className="grid gap-5 md:grid-cols-2">
                    <Field>
                      <FieldLabel htmlFor="full_name">Nom du dossier</FieldLabel>
                      <Input id="full_name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Patient 14" />
                      <FieldDescription>Optionnel. Sert à retrouver le dossier dans le registre.</FieldDescription>
                    </Field>
                    <Field>
                      <FieldLabel>Diagnostic réel, si connu</FieldLabel>
                      <ToggleGroup
                        type="single"
                        variant="outline"
                        value={diagnosis}
                        onValueChange={(v) => v && setDiagnosis(v as typeof diagnosis)}
                        className="w-full"
                      >
                        <ToggleGroupItem value="unknown" className="flex-1">
                          Inconnu
                        </ToggleGroupItem>
                        <ToggleGroupItem value="0" className="flex-1">
                          Préservé
                        </ToggleGroupItem>
                        <ToggleGroupItem value="1" className="flex-1">
                          Atteint
                        </ToggleGroupItem>
                      </ToggleGroup>
                      <FieldDescription>
                        Si le diagnostic est confirmé, le dossier rejoint l'<MedTerm id="train_test">apprentissage</MedTerm> : le
                        modèle se ré-entraîne et les comptes augmentent.
                      </FieldDescription>
                    </Field>
                  </div>

                  {GROUPS.map((group) => (
                    <FieldSet key={group.legend}>
                      <FieldLegend>{group.legend}</FieldLegend>
                      <div className="grid gap-5 md:grid-cols-2">
                        {group.keys.map((key) => {
                          const meta = catalog.meta[key];
                          const choices = catalog.choices[key];
                          const value = values[key] ?? catalog.defaults[key];
                          const label = meta.unit ? `${meta.label} (${meta.unit})` : meta.label;

                          if (choices && choices.length === 2) {
                            return (
                              <Field key={key}>
                                <FieldLabel>{label}</FieldLabel>
                                <ToggleGroup
                                  type="single"
                                  variant="outline"
                                  value={String(value)}
                                  onValueChange={(v) => v && set(key, Number(v))}
                                  className="w-full"
                                >
                                  {choices.map(([code, text]) => (
                                    <ToggleGroupItem key={code} value={String(code)} className="flex-1">
                                      {text}
                                    </ToggleGroupItem>
                                  ))}
                                </ToggleGroup>
                                <FieldDescription>{meta.hint}</FieldDescription>
                              </Field>
                            );
                          }

                          if (choices) {
                            return (
                              <Field key={key}>
                                <FieldLabel htmlFor={key}>{label}</FieldLabel>
                                <Select value={String(value)} onValueChange={(v) => set(key, Number(v))}>
                                  <SelectTrigger id={key} className="w-full">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectGroup>
                                      {choices.map(([code, text]) => (
                                        <SelectItem key={code} value={String(code)}>
                                          {text}
                                        </SelectItem>
                                      ))}
                                    </SelectGroup>
                                  </SelectContent>
                                </Select>
                                <FieldDescription>{meta.hint}</FieldDescription>
                              </Field>
                            );
                          }

                          const [min, max, step] = BOUNDS[key] ?? [0, 300, 1];
                          return (
                            <Field key={key}>
                              <div className="flex items-center justify-between gap-2">
                                <FieldLabel htmlFor={key}>{label}</FieldLabel>
                                <Badge variant="secondary" className="tabular-nums">
                                  {step < 1 ? value.toFixed(1) : value}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-3">
                                <Slider
                                  min={min}
                                  max={max}
                                  step={step}
                                  value={[value]}
                                  onValueChange={([v]) => set(key, v)}
                                  aria-label={label}
                                />
                                <Input
                                  id={key}
                                  type="number"
                                  min={min}
                                  max={max}
                                  step={step}
                                  value={value}
                                  onChange={(e) => set(key, Number(e.target.value))}
                                  className="w-24 tabular-nums"
                                />
                              </div>
                              <FieldDescription>{meta.hint}</FieldDescription>
                            </Field>
                          );
                        })}
                      </div>
                    </FieldSet>
                  ))}
                </FieldGroup>
              </form>
              {error ? (
                <Alert variant="destructive" className="mt-5">
                  <AlertTitle>Prédiction impossible</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : null}
            </CardContent>
            <CardFooter className="justify-end gap-2">
              <Button type="submit" form="exam-form" disabled={busy} size="lg" className="w-full md:w-auto">
                <HeartPulseIcon data-icon="inline-start" />
                {busy ? "Lecture…" : "Prédire le risque"}
              </Button>
            </CardFooter>
          </Card>
        </Reveal>

        <Reveal delay={0.16} className="lg:sticky lg:top-20 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Lecture du modèle</CardTitle>
              <CardDescription>
                {result ? "Probabilité d'accident cardiovasculaire." : "Le cœur attend la première mesure."}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              {result ? (
                <Reveal key={result.probability} y={10} duration={1.1}>
                  <div className="flex flex-col gap-5">
                    <div className="flex items-end justify-between gap-3">
                      <div className={cn("text-5xl font-semibold tracking-tight tabular-nums", TONE_TEXT[tone])}>
                        <CountUp value={result.probability * 100} format={(v) => v.toFixed(1)} />
                        <span className="ml-1 text-2xl text-muted-foreground">%</span>
                      </div>
                      <Badge className={cn("capitalize", TONE_BADGE[tone])}>risque {result.risk}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {result.label === 1
                        ? "Le modèle lit un accident cardiovasculaire probable : la probabilité dépasse le seuil."
                        : "Le modèle lit un profil plutôt préservé : la probabilité reste sous le seuil."}
                    </p>
                    <div className="flex flex-col gap-1.5">
                      <div className="relative">
                        <Progress value={result.probability * 100} className={cn("h-2", tone === "safe" ? "[&>[data-slot=progress-indicator]]:bg-safe" : tone === "warn" ? "[&>[data-slot=progress-indicator]]:bg-warn" : "[&>[data-slot=progress-indicator]]:bg-risk")} />
                        <span
                          className="absolute -top-1 h-4 w-px bg-foreground/70"
                          style={{ left: `${result.threshold * 100}%` }}
                          aria-hidden="true"
                        />
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>0 %</span>
                        <span>seuil {result.threshold}</span>
                        <span>100 %</span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <span className="text-sm font-medium">Ce qui pèse dans la décision</span>
                      <ChartContainer config={chartConfig} className="aspect-auto h-[250px] w-full">
                        <BarChart data={rows} layout="vertical" margin={{ left: 0, right: 12, top: 4, bottom: 4 }}>
                          <CartesianGrid horizontal={false} />
                          <XAxis type="number" tickLine={false} axisLine={false} tickFormatter={(v: number) => v.toFixed(1)} />
                          <YAxis type="category" dataKey="label" width={118} tickLine={false} axisLine={false} interval={0} fontSize={11} />
                          <ChartTooltip cursor={false} content={<ChartTooltipContent hideIndicator />} />
                          <Bar dataKey="contribution" radius={4}>
                            {rows.map((row) => (
                              <Cell key={row.feature} fill={row.contribution >= 0 ? "var(--color-risk)" : "var(--color-safe)"} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ChartContainer>
                      <p className="text-xs text-muted-foreground">
                        Rouge : pousse vers « atteint ». Vert : pousse vers « préservé ». Ce sont des contributions au score z,
                        pas des pourcentages médicaux. Score z = {num(result.logit, 2)} → P = 1 / (1 + e⁻ᶻ).
                      </p>
                    </div>
                  </div>
                </Reveal>
              ) : (
                <div className="flex flex-col gap-4 py-6 text-sm text-muted-foreground">
                  <EcgLine tone="muted" className="h-12" />
                  <p>Remplis la feuille ou charge un exemple réel, puis lance la prédiction.</p>
                </div>
              )}
            </CardContent>
            {result ? (
              <CardFooter className="flex-wrap justify-between gap-2 text-xs">
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant={result.patient?.store === "supabase" ? "default" : "secondary"} className="gap-1.5">
                    {result.patient?.store === "supabase" ? <CloudIcon /> : <DatabaseIcon />}
                    {result.patient?.store === "supabase" ? "Enregistré dans Supabase" : "Hors-ligne : copie locale"}
                  </Badge>
                  {result.learning ? <Badge variant="outline">Utilisé pour l'apprentissage</Badge> : null}
                </div>
                <TicketDialog data={ticketFromPrediction(result)} />
              </CardFooter>
            ) : null}
          </Card>
        </Reveal>
      </div>
    </>
  );
}
