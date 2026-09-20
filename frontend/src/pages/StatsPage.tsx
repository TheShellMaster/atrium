import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts";
import { BuildingIcon, HeartPulseIcon, PercentIcon, UsersIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { PageHeader } from "@/components/PageHeader";
import { MedTerm } from "@/components/MedTerm";
import { StatCard } from "@/components/StatCard";
import { Reveal, RevealGroup, RevealItem } from "@/components/Reveal";
import { api } from "@/lib/api";
import { num, pct } from "@/lib/format";
import type { Stats } from "@/lib/types";

const histConfig: ChartConfig = { count: { label: "Patients", color: "var(--color-primary)" } };
const corrConfig: ChartConfig = { r: { label: "Corrélation r", color: "var(--color-risk)" } };

export function StatsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .stats()
      .then(setStats)
      .catch((err: Error) => setError(err.message));
  }, []);

  if (error) {
    return (
      <>
        <PageHeader title="Statistiques" />
        <Alert variant="destructive">
          <AlertTitle>Statistiques indisponibles</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </>
    );
  }

  if (!stats) {
    return (
      <>
        <PageHeader title="Statistiques" description="Calcul en cours…" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-[420px]" />
      </>
    );
  }

  const missingRate = stats.sources.reduce((acc, s) => acc + s.missing_rate * s.n, 0) / stats.n;

  return (
    <>
      <Reveal>
        <PageHeader
          title="Statistiques"
          description={
            <>
              Avant de prédire, on décrit. <MedTerm id="moyenne">Moyenne</MedTerm>, <MedTerm id="mediane">médiane</MedTerm>,{" "}
              <MedTerm id="ecart_type">écart-type</MedTerm>, <MedTerm id="histogramme">histogrammes</MedTerm> et{" "}
              <MedTerm id="correlation">corrélations</MedTerm> sur les {stats.n} patients des quatre hôpitaux.
            </>
          }
        />
      </Reveal>

      <RevealGroup className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <RevealItem>
          <StatCard label="Patients" value={stats.n} icon={UsersIcon} hint="Après suppression des doublons" />
        </RevealItem>
        <RevealItem>
          <StatCard
            label="Atteints"
            value={stats.target.rate * 100}
            format={(v) => v.toFixed(1)}
            suffix="%"
            icon={HeartPulseIcon}
            tone="risk"
            hint={`${stats.target.atteint} atteints · ${stats.target.preserve} préservés`}
          />
        </RevealItem>
        <RevealItem>
          <StatCard
            label="Sources"
            value={stats.sources.length}
            icon={BuildingIcon}
            hint={stats.sources.length > 4 ? "4 hôpitaux UCI + registre Atrium confirmé" : "Cleveland, Budapest, Zurich/Bâle, Long Beach"}
          />
        </RevealItem>
        <RevealItem>
          <StatCard
            label="Valeurs manquantes"
            value={missingRate * 100}
            format={(v) => v.toFixed(1)}
            suffix="%"
            icon={PercentIcon}
            tone="warn"
            hint="Imputées par médiane ou mode dans le modèle"
          />
        </RevealItem>
      </RevealGroup>

      <Reveal delay={0.12}>
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Quatre hôpitaux et le registre Atrium</CardTitle>
              <CardDescription>
                La part de malades varie du simple au triple selon le recrutement : c'est le{" "}
                <MedTerm id="desequilibre">déséquilibre des classes</MedTerm>.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Hôpital</TableHead>
                    <TableHead className="text-right">Patients</TableHead>
                    <TableHead className="min-w-40">Atteints</TableHead>
                    <TableHead className="text-right">Manquants</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.sources.map((s) => (
                    <TableRow key={s.source}>
                      <TableCell className="font-medium">{s.label}</TableCell>
                      <TableCell className="text-right tabular-nums">{s.n}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Progress value={s.positive_rate * 100} className="h-1.5 w-24 [&>[data-slot=progress-indicator]]:bg-risk" />
                          <span className="tabular-nums">{pct(s.positive_rate, 0)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">{pct(s.missing_rate, 1)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Ce qui est le plus lié à la maladie</CardTitle>
              <CardDescription>
                <MedTerm id="correlation">Corrélation</MedTerm> de chaque variable avec la cible. Positif : plus la valeur monte,
                plus le risque monte.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={corrConfig} className="aspect-auto h-[330px] w-full">
                <BarChart data={stats.correlations} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
                  <CartesianGrid horizontal={false} />
                  <XAxis type="number" domain={[-0.6, 0.6]} tickLine={false} axisLine={false} tickFormatter={(v: number) => v.toFixed(1)} />
                  <YAxis type="category" dataKey="label" width={130} tickLine={false} axisLine={false} interval={0} fontSize={11} />
                  <ChartTooltip cursor={false} content={<ChartTooltipContent hideIndicator />} />
                  <Bar dataKey="r" radius={4}>
                    {stats.correlations.map((row) => (
                      <Cell key={row.feature} fill={row.r >= 0 ? "var(--color-risk)" : "var(--color-safe)"} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>
      </Reveal>

      <Reveal delay={0.2}>
        <Card>
          <CardHeader>
            <CardTitle>Variables numériques</CardTitle>
            <CardDescription>
              Les <MedTerm id="quartile">quartiles</MedTerm> encadrent la moitié « typique » des patients ; la dernière colonne
              compare la moyenne des atteints et des préservés.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Variable</TableHead>
                    <TableHead className="text-right">Moyenne</TableHead>
                    <TableHead className="text-right">Écart-type</TableHead>
                    <TableHead className="text-right">Min</TableHead>
                    <TableHead className="text-right">Q1</TableHead>
                    <TableHead className="text-right">Médiane</TableHead>
                    <TableHead className="text-right">Q3</TableHead>
                    <TableHead className="text-right">Max</TableHead>
                    <TableHead className="text-right">Manquants</TableHead>
                    <TableHead className="text-right">Atteints vs préservés</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.numeric.map((row) => (
                    <TableRow key={row.feature}>
                      <TableCell className="font-medium">
                        {row.label} {row.unit ? <span className="text-muted-foreground">({row.unit})</span> : null}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{num(row.mean, 1)}</TableCell>
                      <TableCell className="text-right tabular-nums">{num(row.std, 1)}</TableCell>
                      <TableCell className="text-right tabular-nums">{num(row.min, 1)}</TableCell>
                      <TableCell className="text-right tabular-nums">{num(row.q25, 1)}</TableCell>
                      <TableCell className="text-right tabular-nums">{num(row.median, 1)}</TableCell>
                      <TableCell className="text-right tabular-nums">{num(row.q75, 1)}</TableCell>
                      <TableCell className="text-right tabular-nums">{num(row.max, 1)}</TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">{row.missing}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        <span className="text-risk">{num(row.by_target.atteint, 1)}</span>
                        <span className="text-muted-foreground"> / </span>
                        <span className="text-safe">{num(row.by_target.preserve, 1)}</span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </Reveal>

      <Reveal delay={0.26}>
        <Card>
          <CardHeader>
            <CardTitle>Distributions</CardTitle>
            <CardDescription>
              Un <MedTerm id="histogramme">histogramme</MedTerm> par variable : chaque barre compte les patients d'une tranche.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue={stats.numeric[0]?.feature} className="gap-4">
              <TabsList className="h-auto flex-wrap">
                {stats.numeric.map((row) => (
                  <TabsTrigger key={row.feature} value={row.feature}>
                    {row.label}
                  </TabsTrigger>
                ))}
              </TabsList>
              {stats.numeric.map((row) => (
                <TabsContent key={row.feature} value={row.feature}>
                  <ChartContainer config={histConfig} className="aspect-auto h-[280px] w-full">
                    <BarChart data={row.histogram} margin={{ left: 8, right: 16, top: 8, bottom: 8 }}>
                      <CartesianGrid vertical={false} />
                      <XAxis dataKey="bin" tickLine={false} axisLine={false} interval={1} fontSize={11} />
                      <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="count" fill="var(--color-count)" radius={4} animationDuration={1200} />
                    </BarChart>
                  </ChartContainer>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <Badge variant="outline">moyenne {num(row.mean, 1)}</Badge>
                    <Badge variant="outline">médiane {num(row.median, 1)}</Badge>
                    <Badge variant="outline">écart-type {num(row.std, 1)}</Badge>
                    <Badge variant="outline">{row.count} valeurs</Badge>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      </Reveal>

      <Reveal delay={0.3}>
        <Card>
          <CardHeader>
            <CardTitle>Variables catégorielles</CardTitle>
            <CardDescription>
              Pour chaque catégorie (encodée en <MedTerm id="onehot">one-hot</MedTerm> dans le modèle), le nombre de patients et
              la part d'atteints.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {stats.categorical.map((cat) => (
              <div key={cat.feature} className="flex flex-col gap-2">
                <span className="text-sm font-medium">{cat.label}</span>
                <div className="flex flex-col gap-1.5">
                  {cat.levels.map((level) => (
                    <div key={level.code} className="flex items-center gap-2 text-xs">
                      <span className="w-28 truncate text-muted-foreground">{level.label}</span>
                      <Progress value={level.positive_rate * 100} className="h-1.5 flex-1 [&>[data-slot=progress-indicator]]:bg-risk" />
                      <span className="w-20 text-right tabular-nums">
                        {pct(level.positive_rate, 0)} · {level.count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </Reveal>
    </>
  );
}
