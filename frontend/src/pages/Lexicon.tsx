import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { PageHeader } from "@/components/PageHeader";
import { MedTerm } from "@/components/MedTerm";
import { EcgLine } from "@/components/EcgLine";
import { Reveal } from "@/components/Reveal";
import { useCabinet } from "@/context/Cabinet";
import { useData } from "@/context/Data";
import type { Term } from "@/lib/types";

const MOOD_TEXT: Record<Term["heart"], string> = {
  idle: "rythme de repos",
  contract: "systole : le cœur se serre",
  expand: "diastole : le cœur se remplit",
  warn: "alerte : le rythme s'emballe",
};

export function Lexicon() {
  const { catalog } = useData();
  const { activeTerm, openTerm, mood } = useCabinet();

  const groups = useMemo(() => {
    const map = new Map<string, Term[]>();
    for (const term of catalog?.terms ?? []) {
      if (!map.has(term.group)) map.set(term.group, []);
      map.get(term.group)!.push(term);
    }
    return [...map.entries()];
  }, [catalog]);

  if (!catalog) {
    return (
      <>
        <PageHeader title="Lexique médical" description="Impression du lexique…" />
        <Skeleton className="h-[480px]" />
      </>
    );
  }

  return (
    <>
      <Reveal>
        <PageHeader
          title="Lexique médical"
          description="Survole un mot : le cœur en arrière-plan change de rythme. Systole serrée, diastole ample, alerte d'angor."
        />
      </Reveal>

      <div className="grid items-start gap-4 lg:grid-cols-5">
        <Reveal delay={0.08} className="lg:col-span-3">
          <Card className="py-0">
            <Command className="rounded-xl bg-transparent">
              <CommandInput placeholder="Chercher un terme…" />
              <CommandList className="max-h-[560px]">
                <CommandEmpty>Aucun terme ne correspond.</CommandEmpty>
                {groups.map(([group, terms]) => (
                  <CommandGroup key={group} heading={group}>
                    {terms.map((term) => (
                      <CommandItem
                        key={term.id}
                        value={`${term.word} ${term.def}`}
                        onSelect={() => openTerm(term)}
                        onMouseEnter={() => openTerm(term)}
                        className="items-start gap-3 py-2.5"
                      >
                        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                          <span className="font-medium">{term.word}</span>
                          <span className="truncate text-xs text-muted-foreground">{term.def}</span>
                        </div>
                        <Badge variant="outline" className="shrink-0 capitalize">
                          {term.group}
                        </Badge>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                ))}
              </CommandList>
            </Command>
          </Card>
        </Reveal>

        <Reveal delay={0.16} className="lg:sticky lg:top-20 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>{activeTerm ? activeTerm.word : "Choisis un mot"}</CardTitle>
              <CardDescription>{activeTerm ? <span className="capitalize">{activeTerm.group}</span> : "La définition apparaît ici."}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {activeTerm ? (
                <Reveal key={activeTerm.id} y={8} duration={0.8}>
                  <p className="text-sm leading-relaxed">{activeTerm.def}</p>
                </Reveal>
              ) : (
                <p className="text-sm text-muted-foreground">Survole ou sélectionne un terme dans la liste.</p>
              )}
              <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>Rythme du cœur</span>
                <Badge variant={mood === "warn" ? "destructive" : "secondary"}>{MOOD_TEXT[mood]}</Badge>
              </div>
              <EcgLine className="h-10" />
            </CardContent>
          </Card>
        </Reveal>
      </div>

      <Reveal delay={0.24}>
        <div className="grid gap-4 md:grid-cols-3">
          <Card size="sm">
            <CardHeader>
              <CardTitle>Faux négatif ↔ malade renvoyé chez lui</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Un <MedTerm id="fn">faux négatif</MedTerm> n'est pas une ligne d'un tableau : c'est un patient avec un{" "}
              <MedTerm id="infarctus">infarctus</MedTerm> en préparation que le modèle a rassuré. La sensibilité mesure combien
              on en laisse passer.
            </CardContent>
          </Card>
          <Card size="sm">
            <CardHeader>
              <CardTitle>Seuil ↔ prudence du médecin</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Baisser le <MedTerm id="seuil">seuil</MedTerm>, c'est demander des examens complémentaires plus tôt : moins de
              faux négatifs, plus de fausses alertes. Le choisir est une décision clinique, pas seulement statistique.
            </CardContent>
          </Card>
          <Card size="sm">
            <CardHeader>
              <CardTitle>Régression ↔ facteurs de risque</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              La <MedTerm id="regression">régression logistique</MedTerm> pondère <MedTerm id="cholesterol">cholestérol</MedTerm>,{" "}
              <MedTerm id="hypertension">tension</MedTerm>, <MedTerm id="angor">angor</MedTerm> et <MedTerm id="ecg">ECG</MedTerm>{" "}
              exactement comme un cardiologue combine les facteurs de risque.
            </CardContent>
          </Card>
        </div>
      </Reveal>
    </>
  );
}
