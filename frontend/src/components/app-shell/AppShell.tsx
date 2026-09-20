import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { CloudIcon, DatabaseIcon, RefreshCwIcon } from "lucide-react";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { PointerTracker } from "@/components/PointerTracker";
import { HeartbeatSound } from "@/components/HeartbeatSound";
import { CursorGlow } from "@/components/CursorGlow";
import { SoundToggle } from "@/components/SoundToggle";
import { VesselBackground } from "@/components/heart/VesselBackground";
import { HeartScene } from "@/components/heart/HeartScene";
import { useScrollProgress } from "@/hooks/useScrollProgress";
import { cn } from "@/lib/utils";
import { AppSidebar, NAV } from "./AppSidebar";
import { useData } from "@/context/Data";

function StorageBadge() {
  const { model } = useData();
  if (!model) return null;
  const cloud = model.storage.supabase;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant={cloud ? "default" : "destructive"} className="gap-1.5">
          {cloud ? <CloudIcon /> : <DatabaseIcon />}
          {cloud ? "Supabase connecté" : "Supabase injoignable"}
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        {cloud
          ? "Les dossiers, prédictions et métriques sont écrits dans le projet Supabase (PostgreSQL)."
          : "Hors-ligne : les dossiers sont gardés dans une copie locale temporaire jusqu'au retour du réseau."}
      </TooltipContent>
    </Tooltip>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const { reload, error } = useData();
  const progress = useScrollProgress();
  const current = NAV.find((n) => n.to === pathname) ?? NAV[0];

  return (
    <SidebarProvider>
      <PointerTracker />
      <HeartbeatSound />
      <CursorGlow />
      <AppSidebar />
      <SidebarInset className="relative isolate overflow-x-clip">
        <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
          <div className="sticky top-0 h-dvh w-full overflow-hidden">
            <VesselBackground
              className="absolute inset-0 opacity-70 dark:opacity-100"
              seed={11}
              trunks={9}
              intensity={pathname === "/" ? 0.42 : 0.26}
              center={[0.7, 0.42]}
              reach={1.05}
              grow={progress}
            />
            <HeartScene
              className={cn("absolute inset-0 transition-opacity duration-1000", pathname === "/" ? "opacity-100" : "opacity-60")}
              scroll={progress}
            />
          </div>
        </div>
        <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink asChild>
                  <Link to="/">Atrium</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>{current.crumb}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div className="ml-auto flex items-center gap-2">
            {error ? (
              <Button variant="outline" size="sm" onClick={reload}>
                <RefreshCwIcon data-icon="inline-start" />
                Reconnecter l'API
              </Button>
            ) : (
              <StorageBadge />
            )}
            <SoundToggle />
            <ThemeToggle />
          </div>
        </header>
        <main className="flex flex-1 flex-col gap-6 p-4 md:p-6 lg:p-8">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
