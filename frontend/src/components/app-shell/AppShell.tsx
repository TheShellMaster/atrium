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
import { VesselBackground } from "@/components/heart/VesselBackground";
import { AppSidebar, NAV } from "./AppSidebar";
import { useData } from "@/context/Data";

function StorageBadge() {
  const { model } = useData();
  if (!model) return null;
  const cloud = model.storage.supabase;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant={cloud ? "default" : "secondary"} className="gap-1.5">
          {cloud ? <CloudIcon /> : <DatabaseIcon />}
          {cloud ? "Supabase connecté" : "SQLite local"}
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        {cloud
          ? "Les dossiers et les métriques sont écrits dans le projet Supabase."
          : "Cloud injoignable : les dossiers sont conservés dans une copie locale."}
      </TooltipContent>
    </Tooltip>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const { reload, error } = useData();
  const current = NAV.find((n) => n.to === pathname) ?? NAV[0];

  return (
    <SidebarProvider>
      <PointerTracker />
      <AppSidebar />
      <SidebarInset className="relative isolate overflow-x-clip">
        {pathname === "/" ? (
          <VesselBackground className="absolute inset-0 -z-10 hidden dark:block" seed={11} trunks={6} intensity={0.2} />
        ) : null}
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
            <ThemeToggle />
          </div>
        </header>
        <main className="flex flex-1 flex-col gap-6 p-4 md:p-6 lg:p-8">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
