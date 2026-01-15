import { createContext, useContext, useState, ReactNode } from "react";

export type FiltersState = {
  startDate: string;
  endDate: string;
  selectedGroup: string | "Todos";
  selectedAgent: string | "Todos";
};

export type FiltersContextValue = FiltersState & {
  setStartDate: (value: string) => void;
  setEndDate: (value: string) => void;
  setSelectedGroup: (value: string | "Todos") => void;
  setSelectedAgent: (value: string | "Todos") => void;
};

const FiltersContext = createContext<FiltersContextValue | undefined>(undefined);

export function FiltersProvider({ children }: { children: ReactNode }) {
  // Padrão: dia atual e grupo Suporte
  const today = new Date().toISOString().split("T")[0];
  
  const [startDate, setStartDate] = useState<string>(today);
  const [endDate, setEndDate] = useState<string>(today);
  // Fallback de grupo "Suporte" (id 37000043862) se disponível; senão mantém "Todos"
  const [selectedGroup, setSelectedGroup] = useState<string | "Todos">("37000043862");
  const [selectedAgent, setSelectedAgent] = useState<string | "Todos">("Todos");

  const value: FiltersContextValue = {
    startDate,
    endDate,
    selectedGroup,
    selectedAgent,
    setStartDate,
    setEndDate,
    setSelectedGroup,
    setSelectedAgent,
  };

  return <FiltersContext.Provider value={value}>{children}</FiltersContext.Provider>;
}

export function useFilters() {
  const ctx = useContext(FiltersContext);
  if (!ctx) {
    throw new Error("useFilters deve ser usado dentro de FiltersProvider");
  }
  return ctx;
}
