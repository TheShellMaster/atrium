import { Navigate, Route, Routes } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { AppShell } from "@/components/app-shell/AppShell";
import { IntroSplash } from "@/components/IntroSplash";
import { CabinetProvider } from "@/context/Cabinet";
import { DataProvider } from "@/context/Data";
import { Dashboard } from "@/pages/Dashboard";
import { Exam } from "@/pages/Exam";
import { Lexicon } from "@/pages/Lexicon";
import { Model } from "@/pages/Model";
import { Patients } from "@/pages/Patients";
import { StatsPage } from "@/pages/StatsPage";
import { Docs } from "@/pages/Docs";

export function App() {
  return (
    <ThemeProvider>
      <TooltipProvider delayDuration={200}>
        <CabinetProvider>
          <DataProvider>
            <AppShell>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/examen" element={<Exam />} />
                <Route path="/modele" element={<Model />} />
                <Route path="/statistiques" element={<StatsPage />} />
                <Route path="/patients" element={<Patients />} />
                <Route path="/lexique" element={<Lexicon />} />
                <Route path="/documentation" element={<Docs />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </AppShell>
            <IntroSplash />
            <Toaster richColors position="bottom-right" />
          </DataProvider>
        </CabinetProvider>
      </TooltipProvider>
    </ThemeProvider>
  );
}
