import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Layout from "@/components/Layout";
import { FiltersProvider } from "@/context/FiltersContext";
import OverviewPage from "@/pages/OverviewPage";
import TeamPage from "@/pages/TeamPage";
import TelephonyPage from "@/pages/TelephonyPage";
import KpisPage from "@/pages/KpisPage";
import TelephonyQueue8424450Page from "@/pages/TelephonyQueue8424450Page";

export default function App() {
  return (
    <FiltersProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<OverviewPage />} />
            <Route path="kpis" element={<KpisPage />} />
            <Route path="equipe" element={<TeamPage />} />
            <Route path="telefonia" element={<TelephonyPage />} />
            <Route path="telefonia/fila-8424450" element={<TelephonyQueue8424450Page />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </FiltersProvider>
  );
}
