import { Navigate, Route, Routes } from "react-router-dom";
import { GreenCross } from "./components/GreenCross";
import { EcgRibbon } from "./components/EcgRibbon";
import { MouseAura } from "./components/MouseAura";
import { Nav } from "./components/Nav";
import { CabinetProvider } from "./context/Cabinet";
import { DataProvider, useData } from "./context/Data";
import { Exam } from "./pages/Exam";
import { Home } from "./pages/Home";
import { Lexicon } from "./pages/Lexicon";
import { Model } from "./pages/Model";
import { Patients } from "./pages/Patients";

function Frame() {
  const { catalog, error } = useData();
  return (
    <div className="stage">
      <GreenCross />
      <MouseAura />
      <div className="shell">
        <Nav />
        {error && !catalog ? (
          <p className="chart-paper">
            L'API Python ne répond pas encore. Lance `make dev` puis recharge. {error}
          </p>
        ) : (
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/examen" element={<Exam />} />
            <Route path="/modele" element={<Model />} />
            <Route path="/patients" element={<Patients />} />
            <Route path="/lexique" element={<Lexicon />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        )}
      </div>
      <EcgRibbon />
    </div>
  );
}

export function App() {
  return (
    <CabinetProvider>
      <DataProvider>
        <Frame />
      </DataProvider>
    </CabinetProvider>
  );
}
