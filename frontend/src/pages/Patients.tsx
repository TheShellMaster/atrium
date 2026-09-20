import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ActivityIcon,
  CloudIcon,
  DatabaseIcon,
  DownloadIcon,
  FileSpreadsheetIcon,
  HeartPulseIcon,
  ReceiptTextIcon,
  RefreshCwIcon,
  SearchIcon,
  StethoscopeIcon,
  UploadIcon,
  UsersIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { MedTerm } from "@/components/MedTerm";
import { TicketDialog, ticketFromRow } from "@/components/ConsultationTicket";
import { Reveal, RevealGroup, RevealItem } from "@/components/Reveal";
import { api } from "@/lib/api";
import { dateFr, pct } from "@/lib/format";
import type { ImportResult, PatientRow } from "@/lib/types";

type Filter = "all" | "positive" | "negative";

export function Patients() {
  const [rows, setRows] = useState<PatientRow[] | null>(null);
  const [cloud, setCloud] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [busy, setBusy] = useState(false);
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState<ImportResult | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

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

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setImporting(true);
    try {
      const result = await api.importFile(file, true);
      setImported(result);
      toast.success(`${result.rows} patients importés`, {
        description: `${result.positives} lus « atteint »${result.accuracy !== null ? ` · exactitude ${pct(result.accuracy)}` : ""}`,
      });
      load();
    } catch (err) {
      toast.error("Import impossible", { description: err instanceof Error ? err.message : undefined });
    } finally {
      setImporting(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  };

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
      <input
        ref={fileInput}
        type="file"
        accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        className="hidden"
        onChange={(e) => onFile(e.target.files?.[0])}
      />
      <Reveal>
        <PageHeader
          title="Registre des patients"
          description={
            <>
              Chaque examen est une ligne dans <MedTerm id="supabase">Supabase</MedTerm>. Importe un fichier{" "}
              <MedTerm id="csv">CSV ou Excel</MedTerm> pour prédire en lot, exporte le registre pour l'analyser ailleurs.
            </>
          }
          actions={
            <>
              {cloud !== null ? (
                <Badge variant={cloud ? "default" : "destructive"} className="gap-1.5">
                  {cloud ? <CloudIcon /> : <DatabaseIcon />}
                  {cloud ? "Supabase connecté" : "Supabase injoignable"}
                </Badge>
              ) : null}
              <Button variant="outline" size="sm" onClick={() => fileInput.current?.click()} disabled={importing}>
                <UploadIcon data-icon="inline-start" />
                {importing ? "Import…" : "Importer CSV / Excel"}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <DownloadIcon data-icon="inline-start" />
                    Exporter
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuGroup>
                    <DropdownMenuLabel>Registre complet</DropdownMenuLabel>
                    <DropdownMenuItem asChild>
                      <a href={api.exportUrl("csv")} download>
                        <FileSpreadsheetIcon />
                        Fichier CSV
                      </a>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <a href={api.exportUrl("xlsx")} download>
                        <FileSpreadsheetIcon />
                        Classeur Excel (patients + modèle)
                      </a>
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem asChild>
                      <a href={api.templateUrl} download>
                        <DownloadIcon />
                        Modèle de fichier d'import
                      </a>
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button variant="ghost" size="sm" onClick={load} disabled={busy} aria-label="Actualiser">
                <RefreshCwIcon className={busy ? "animate-spin" : undefined} />
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

      {imported ? (
        <Reveal>
          <Card>
            <CardHeader>
              <CardTitle>Import « {imported.filename} »</CardTitle>
              <CardDescription>
                {imported.rows} lignes lues, {imported.saved} enregistrées, {imported.positives} lues « atteint »
                {imported.accuracy !== null ? ` · exactitude sur les diagnostics fournis : ${pct(imported.accuracy)}` : ""}.
              </CardDescription>
              <CardAction>
                <Button variant="ghost" size="sm" onClick={() => setImported(null)}>
                  Fermer
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent>
              <div className="max-h-72 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Dossier</TableHead>
                      <TableHead>Âge</TableHead>
                      <TableHead>Lecture</TableHead>
                      <TableHead className="text-right">Probabilité</TableHead>
                      <TableHead className="text-right">Diagnostic fourni</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {imported.items.map((item, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{item.full_name || `Ligne ${i + 1}`}</TableCell>
                        <TableCell className="tabular-nums">{item.features.age}</TableCell>
                        <TableCell>
                          <Badge variant={item.label === 1 ? "destructive" : "secondary"}>{item.label === 1 ? "Atteint" : "Préservé"}</Badge>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{pct(item.probability)}</TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {item.actual_label === null ? "—" : item.actual_label === 1 ? "atteint" : "préservé"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </Reveal>
      ) : null}

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
                      <TableHead className="text-right">Ticket</TableHead>
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
                          <TableCell className="text-right">
                            <TicketDialog
                              data={ticketFromRow(row)}
                              trigger={
                                <Button variant="ghost" size="icon" aria-label={`Ticket de ${row.full_name || "ce dossier"}`}>
                                  <ReceiptTextIcon />
                                </Button>
                              }
                            />
                          </TableCell>
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
