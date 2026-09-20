import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CloudIcon, DatabaseIcon, RefreshCwIcon, SearchIcon, StethoscopeIcon, UsersIcon, ActivityIcon, HeartPulseIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Reveal, RevealGroup, RevealItem } from "@/components/Reveal";
import { api } from "@/lib/api";
import { dateFr, pct } from "@/lib/format";
import type { PatientRow } from "@/lib/types";

type Filter = "all" | "positive" | "negative";

export function Patients() {
  const [rows, setRows] = useState<PatientRow[] | null>(null);
  const [cloud, setCloud] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setBusy(true);
    api
      .patients()
      .then((data) => {
        setRows(data.items);
        setCloud(data.storage.supabase);
        setError(null);
      })
      .catch((err: Error) => setError(err.message || "Registre injoignable"))
      .finally(() => setBusy(false));
  }, []);

  useEffect(load, [load]);

  const visible = useMemo(() => {
    if (!rows) return [];
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (filter === "positive" && row.predicted_label !== 1) return false;
      if (filter === "negative" && row.predicted_label === 1) return false;
      if (q && !(row.full_name || "anonyme").toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rows, query, filter]);

  const stats = useMemo(() => {
    if (!rows || rows.length === 0) return { total: 0, positive: 0, mean: 0 };
    const positive = rows.filter((r) => r.predicted_label === 1).length;
    const probas = rows.map((r) => Number(r.predicted_proba ?? 0));
    return { total: rows.length, positive: positive / rows.length, mean: probas.reduce((a, b) => a + b, 0) / rows.length };
  }, [rows]);

  return (
    <>
      <Reveal>
        <PageHeader
          title="Registre des patients"
          description="Chaque examen est une ligne dans la base de données : c'est exactement le rôle de Supabase dans le projet."
          actions={
            <>
              {cloud !== null ? (
                <Badge variant={cloud ? "default" : "secondary"} className="gap-1.5">
                  {cloud ? <CloudIcon /> : <DatabaseIcon />}
                  {cloud ? "Supabase connecté" : "SQLite local"}
                </Badge>
              ) : null}
              <Button variant="outline" size="sm" onClick={load} disabled={busy}>
                <RefreshCwIcon data-icon="inline-start" className={busy ? "animate-spin" : undefined} />
                Actualiser
              </Button>
              <Button size="sm" asChild>
                <Link to="/examen">
                  <StethoscopeIcon data-icon="inline-start" />
                  Nouvel examen
                </Link>
              </Button>
            </>
          }
        />
      </Reveal>

      <RevealGroup className="grid gap-4 sm:grid-cols-3">
        <RevealItem>
          <StatCard label="Dossiers enregistrés" value={stats.total} icon={UsersIcon} hint="Lignes dans la table patients" />
        </RevealItem>
        <RevealItem>
          <StatCard
            label="Lus « atteint »"
            value={stats.positive * 100}
            format={(v) => v.toFixed(0)}
            suffix="%"
            icon={HeartPulseIcon}
            tone="risk"
            hint="Part des dossiers au-dessus du seuil"
          />
        </RevealItem>
        <RevealItem>
          <StatCard
            label="Probabilité moyenne"
            value={stats.mean * 100}
            format={(v) => v.toFixed(1)}
            suffix="%"
            icon={ActivityIcon}
            hint="Moyenne des probabilités prédites"
          />
        </RevealItem>
      </RevealGroup>

      <Reveal delay={0.15}>
        <Card>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <InputGroup className="md:max-w-sm">
                <InputGroupAddon>
                  <SearchIcon />
                </InputGroupAddon>
                <InputGroupInput
                  placeholder="Chercher un dossier…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  aria-label="Chercher un dossier"
                />
              </InputGroup>
              <ToggleGroup type="single" variant="outline" value={filter} onValueChange={(v) => v && setFilter(v as Filter)}>
                <ToggleGroupItem value="all">Tous</ToggleGroupItem>
                <ToggleGroupItem value="positive">Atteints</ToggleGroupItem>
                <ToggleGroupItem value="negative">Préservés</ToggleGroupItem>
              </ToggleGroup>
            </div>

            {error ? (
              <Alert variant="destructive">
                <AlertTitle>Registre injoignable</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : rows === null ? (
              <div className="flex flex-col gap-2">
                {Array.from({ length: 5 }, (_, i) => (
                  <Skeleton key={i} className="h-11 w-full" />
                ))}
              </div>
            ) : visible.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-12 text-center">
                <UsersIcon className="size-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {rows.length === 0 ? "Aucun dossier pour le moment." : "Aucun dossier ne correspond à ce filtre."}
                </p>
                {rows.length === 0 ? (
                  <Button asChild>
                    <Link to="/examen">Ouvrir le premier examen</Link>
                  </Button>
                ) : null}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Dossier</TableHead>
                      <TableHead>Âge</TableHead>
                      <TableHead>Sexe</TableHead>
                      <TableHead>Lecture</TableHead>
                      <TableHead className="min-w-44">Probabilité</TableHead>
                      <TableHead className="text-right">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visible.map((row) => {
                      const proba = Number(row.predicted_proba ?? 0);
                      const positive = row.predicted_label === 1;
                      return (
                        <TableRow key={row.id}>
                          <TableCell className="font-medium">{row.full_name || "Anonyme"}</TableCell>
                          <TableCell className="tabular-nums">{row.age}</TableCell>
                          <TableCell>{row.sex === 1 ? "Homme" : "Femme"}</TableCell>
                          <TableCell>
                            <Badge variant={positive ? "destructive" : "secondary"}>{positive ? "Atteint" : "Préservé"}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Progress
                                value={proba * 100}
                                className={positive ? "h-1.5 w-24 [&>[data-slot=progress-indicator]]:bg-risk" : "h-1.5 w-24 [&>[data-slot=progress-indicator]]:bg-safe"}
                              />
                              <span className="tabular-nums">{pct(proba)}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">{dateFr(row.created_at)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </Reveal>
    </>
  );
}
