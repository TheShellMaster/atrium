import { PrinterIcon, ReceiptTextIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { GreenCross } from "@/components/GreenCross";
import { useData } from "@/context/Data";
import { dateFr, num, pct, riskTone } from "@/lib/format";
import type { Contribution, PatientRow, Prediction } from "@/lib/types";
import { cn } from "@/lib/utils";

export type TicketData = {
  id: string;
  name: string;
  date: string;
  features: Record<string, number>;
  probability: number;
  label: number;
  risk: string;
  contributions?: Contribution[];
  actualLabel?: number | null;
  store?: string | null;
};

function riskFromProbability(p: number): string {
  if (p < 0.25) return "faible";
  if (p < 0.5) return "modéré";
  if (p < 0.75) return "élevé";
  return "critique";
}

export function ticketFromPrediction(prediction: Prediction): TicketData {
  const patient = prediction.patient ?? {};
  return {
    id: String(patient.id ?? "brouillon"),
    name: prediction.full_name || "Dossier anonyme",
    date: String(patient.created_at ?? new Date().toISOString()),
    features: prediction.features ?? {},
    probability: prediction.probability,
    label: prediction.label,
    risk: prediction.risk,
    contributions: prediction.contributions,
    store: typeof patient.store === "string" ? patient.store : null,
  };
}

export function ticketFromRow(row: PatientRow): TicketData {
  const p = Number(row.predicted_proba ?? 0);
  return {
    id: row.id,
    name: row.full_name || "Dossier anonyme",
    date: row.created_at,
    features: {
      age: row.age,
      sex: row.sex,
      cp: row.chest_pain ?? 0,
      trestbps: row.resting_bp ?? 0,
      chol: row.cholesterol ?? 0,
      fbs: row.fasting_bs ?? 0,
      restecg: row.rest_ecg ?? 0,
      thalach: row.max_hr ?? 0,
      exang: row.exercise_angina ?? 0,
      oldpeak: Number(row.oldpeak ?? 0),
      slope: row.slope ?? 0,
      ca: row.ca ?? 0,
      thal: row.thal ?? 0,
    },
    probability: p,
    label: row.predicted_label ?? Number(p >= 0.5),
    risk: riskFromProbability(p),
    actualLabel: row.actual_label ?? null,
  };
}

const TONE_TEXT = { safe: "text-safe", warn: "text-warn", risk: "text-risk" } as const;

function TicketBody({ data }: { data: TicketData }) {
  const { catalog, model } = useData();
  const tone = riskTone(data.risk);
  const label = (key: string) => catalog?.meta[key]?.label ?? key;
  const value = (key: string, v: number) => {
    const choices = catalog?.choices[key];
    if (choices) return choices.find(([c]) => c === v)?.[1] ?? String(v);
    const unit = catalog?.meta[key]?.unit;
    return `${key === "oldpeak" ? v.toFixed(1) : v}${unit ? ` ${unit}` : ""}`;
  };

  return (
    <div className="print-ticket mx-auto w-full max-w-md rounded-xl border bg-card p-5 font-mono text-[13px] text-card-foreground shadow-sm print:max-w-none print:border-0 print:shadow-none">
      <div className="flex items-center gap-3">
        <GreenCross className="size-9" />
        <div className="flex flex-col">
          <span className="text-base font-semibold tracking-tight">Atrium</span>
          <span className="text-xs text-muted-foreground">Ticket de consultation · lecture du risque cardiovasculaire</span>
        </div>
      </div>
      <Separator className="my-4" />
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
        <dt className="text-muted-foreground">Dossier</dt>
        <dd className="text-right font-medium">{data.name}</dd>
        <dt className="text-muted-foreground">Date</dt>
        <dd className="text-right">{dateFr(data.date)}</dd>
        <dt className="text-muted-foreground">Référence</dt>
        <dd className="truncate text-right text-xs">{data.id.slice(0, 8).toUpperCase()}</dd>
      </dl>
      <Separator className="my-4" />
      <div className="flex flex-col gap-1">
        {Object.entries(data.features).map(([key, v]) => (
          <div key={key} className="flex items-baseline justify-between gap-3">
            <span className="text-muted-foreground">{label(key)}</span>
            <span className="flex-1 border-b border-dotted border-border/70" aria-hidden="true" />
            <span className="tabular-nums">{value(key, Number(v))}</span>
          </div>
        ))}
      </div>
      <Separator className="my-4" />
      <div className="flex items-end justify-between gap-3">
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground">Probabilité d'atteinte</span>
          <span className={cn("text-4xl font-semibold tabular-nums", TONE_TEXT[tone])}>{pct(data.probability)}</span>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Badge variant={data.label === 1 ? "destructive" : "secondary"}>{data.label === 1 ? "Atteint" : "Préservé"}</Badge>
          <span className="text-xs capitalize text-muted-foreground">risque {data.risk} · seuil 0,5</span>
          {data.actualLabel !== null && data.actualLabel !== undefined ? (
            <span className="text-xs text-muted-foreground">diagnostic réel : {data.actualLabel === 1 ? "atteint" : "préservé"}</span>
          ) : null}
        </div>
      </div>
      {data.contributions && data.contributions.length ? (
        <>
          <Separator className="my-4" />
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Ce qui a pesé (contribution au score z)</span>
            {data.contributions.slice(0, 5).map((c) => (
              <div key={c.feature} className="flex items-baseline justify-between gap-3">
                <span>{c.label}</span>
                <span className={cn("tabular-nums", c.contribution >= 0 ? "text-risk" : "text-safe")}>
                  {c.contribution >= 0 ? "+" : ""}
                  {num(c.contribution, 2)}
                </span>
              </div>
            ))}
          </div>
        </>
      ) : null}
      <Separator className="my-4" />
      <div className="flex flex-col gap-1 text-xs text-muted-foreground">
        <span>
          Modèle : régression logistique · {model ? `${model.n_total} patients UCI · exactitude ${pct(model.accuracy)} · AUC ${num(model.auc, 3)}` : "…"}
        </span>
        <span>Stockage : {data.store === "supabase" ? "Supabase" : data.store === "sqlite" ? "copie locale" : "registre"}</span>
        <span>Outil pédagogique : ne remplace pas un avis médical.</span>
      </div>
    </div>
  );
}

export function TicketDialog({
  data,
  trigger,
}: {
  data: TicketData;
  trigger?: React.ReactNode;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm">
            <ReceiptTextIcon data-icon="inline-start" />
            Ticket de consultation
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader className="print:hidden">
          <DialogTitle>Ticket de consultation</DialogTitle>
          <DialogDescription>Récapitulatif imprimable de l'examen et de la lecture du modèle.</DialogDescription>
        </DialogHeader>
        <TicketBody data={data} />
        <div className="flex justify-end gap-2 print:hidden">
          <Button onClick={() => window.print()}>
            <PrinterIcon data-icon="inline-start" />
            Imprimer / enregistrer en PDF
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
