import { Navigate, Route, Routes } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { AppShell } from "@/components/app-shell/AppShell";
import { CabinetProvider } from "@/context/Cabinet";
import { DataProvider } from "@/context/Data";
import { Dashboard } from "@/pages/Dashboard";
import { Exam } from "@/pages/Exam";
import { Lexicon } from "@/pages/Lexicon";
import { Model } from "@/pages/Model";
import { Patients } from "@/pages/Patients";

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
                <Route path="/patients" element={<Patients />} />
                <Route path="/lexique" element={<Lexicon />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </AppShell>
            <Toaster richColors position="bottom-right" />
          </DataProvider>
        </CabinetProvider>
      </TooltipProvider>
    </ThemeProvider>
  );
}
