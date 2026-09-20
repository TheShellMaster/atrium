import { NavLink, useLocation } from "react-router-dom";
import { ActivityIcon, BookOpenIcon, LayoutDashboardIcon, StethoscopeIcon, UsersIcon } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { GreenCross } from "@/components/GreenCross";
import { EcgLine } from "@/components/EcgLine";
import { useData } from "@/context/Data";
import { num } from "@/lib/format";

export const NAV = [
  { to: "/", label: "Tableau de bord", icon: LayoutDashboardIcon, crumb: "Tableau de bord" },
  { to: "/examen", label: "Examen", icon: StethoscopeIcon, crumb: "Examen d'un patient" },
  { to: "/modele", label: "Modèle", icon: ActivityIcon, crumb: "Modèle & métriques" },
  { to: "/patients", label: "Registre", icon: UsersIcon, crumb: "Registre des patients" },
  { to: "/lexique", label: "Lexique", icon: BookOpenIcon, crumb: "Lexique médical" },
] as const;

export function AppSidebar() {
  const { pathname } = useLocation();
  const { model } = useData();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <NavLink to="/">
                <GreenCross className="size-8" />
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Atrium</span>
                  <span className="truncate text-xs text-muted-foreground">Risque cardiovasculaire</span>
                </div>
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Cabinet</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV.map((item) => (
                <SidebarMenuItem key={item.to}>
                  <SidebarMenuButton asChild isActive={pathname === item.to} tooltip={item.label}>
                    <NavLink to={item.to} end>
                      <item.icon />
                      <span>{item.label}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="gap-3 group-data-[collapsible=icon]:hidden">
        <EcgLine className="h-8" tone="muted" />
        <div className="flex items-center justify-between gap-2 px-1 text-xs text-muted-foreground">
          <span>UCI Cleveland · 303 patients</span>
          {model ? <Badge variant="outline">AUC {num(model.auc, 3)}</Badge> : null}
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
