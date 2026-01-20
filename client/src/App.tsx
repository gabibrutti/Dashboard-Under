import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Layout from "@/components/Layout";
import { FiltersProvider } from "@/context/FiltersContext";
import OverviewPage from "@/pages/OverviewPage";
import TeamPage from "@/pages/TeamPage";

export default function App() {
  return (
    <FiltersProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<OverviewPage />} />
            <Route path="performance" element={<TeamPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </FiltersProvider>
  );
}
