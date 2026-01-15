import { useMemo, useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
import { apiUrl } from "@/config/api";
  Calculator,
  Gauge,
  Star,
  TrendingUp,
  Calendar,
  Users,
  Search,
  AlertTriangle,
} from "lucide-react";
import { useFilters } from "@/context/FiltersContext";
import { useHdiMetrics } from "@/hooks/useHdiMetrics";

interface Group {
  id: number;
  name: string;
}

interface KpiCard {
  id: string;
  label: string;
  value: string;
  helper: string;
  formula?: string;
  status?: "success" | "warning" | "danger" | "neutral";
  row: number;
}

export default function KpisPage() {
  const { startDate, endDate, selectedGroup, selectedAgent, setStartDate, setEndDate, setSelectedGroup } =
    useFilters();

  const [groups, setGroups] = useState<Group[]>([]);

  // Carregar grupos
  useEffect(() => {
    async function loadGroups() {
      try {
        const res = await fetch(apiUrl("/api/groups"));
        if (res.ok) {
          const data = await res.json();
          setGroups(data);
        }
      } catch (err) {
        console.error("Erro ao carregar grupos:", err);
      }
    }
    loadGroups();
  }, []);

  // Filtrar grupos permitidos
  const allowedGroups = ["suporte", "data center", "datacenter", "delivery", "registros de ligações", "registros de ligacoes", "qualidade", "suporte interno"];
  const filteredGroups = groups.filter(group => 
    allowedGroups.some(allowed => group.name.toLowerCase().includes(allowed))
  );

  const { data, isLoading, error, fetchMetrics } = useHdiMetrics({
    startDate,
    endDate,
    groupId: selectedGroup,
    agentId: selectedAgent,
    autoFetch: false, // Buscar apenas ao clicar em Buscar
  });

  const handleSearch = () => {
    fetchMetrics();
  };

  // Função para períodos rápidos
  const handleQuickRange = (range: string) => {
    const today = new Date();
    let start = new Date();

    switch (range) {
      case "today":
        start = today;
        break;
      case "7":
        start.setDate(today.getDate() - 7);
        break;
      case "15":
        start.setDate(today.getDate() - 15);
        break;
      case "30":
        start.setDate(today.getDate() - 30);
        break;
      default:
        break;
    }

    setStartDate(start.toISOString().split("T")[0]);
    setEndDate(today.toISOString().split("T")[0]);
  };

  // Formatar valores
  const formatPercent = (value: number) => `${value.toFixed(1)}%`;
  const formatNumber = (value: number) => value.toLocaleString("pt-BR");

  // KPIs com cards flip
  const kpiCards: KpiCard[] = useMemo(() => {
    if (!data) return [];

    const slaCompliance = data.slaDonut.within + data.slaDonut.breached > 0 
      ? (data.slaDonut.within / (data.slaDonut.within + data.slaDonut.breached)) * 100 
      : 0;

    return [
      // Linha 1: Eficiência Operacional
      {
        id: "fcr",
        label: "FCR - First Contact Resolution",
        value: formatPercent(data.fcr.rate),
        helper: `${data.fcr.count}/${data.fcr.totalEligible} resolvidos no 1º contato. Fórmula: (Incidentes Resolvidos no 1º Contato / Total de Contatos) × 100`,
        formula: "(Resolvidos 1º Contato / Total) × 100",
        status: data.fcr.rate >= 80 ? "success" : data.fcr.rate >= 60 ? "warning" : "danger",
        row: 1,
      },
      {
        id: "flr",
        label: "FLR - First Level Resolution",
        value: formatPercent(data.flr.rate),
        helper: `${data.flr.count}/${data.flr.totalEligible} resolvidos em N1. Fórmula: (Incidentes Resolvidos pelo N1 / Total de Incidentes) × 100`,
        formula: "(Resolvidos N1 / Total) × 100",
        status: data.flr.rate >= 80 ? "success" : data.flr.rate >= 60 ? "warning" : "danger",
        row: 1,
      },
      {
        id: "sla",
        label: "SLA Compliance",
        value: formatPercent(slaCompliance),
        helper: `${data.slaDonut.within} tickets dentro do prazo. Fórmula: (Tickets Dentro do SLA / Total de Tickets) × 100`,
        formula: "(Dentro SLA / Total) × 100",
        status: slaCompliance >= 90 ? "success" : slaCompliance >= 75 ? "warning" : "danger",
        row: 1,
      },
      {
        id: "backlog",
        label: "Backlog Atual",
        value: formatNumber(data.backlog),
        helper: "Tickets ainda em aberto aguardando resolução. Quanto menor, melhor a eficiência da equipe.",
        status: data.backlog <= 50 ? "success" : data.backlog <= 100 ? "warning" : "danger",
        row: 1,
      },
      // Linha 2: Qualidade e Satisfação
      {
        id: "csat",
        label: "CSAT Médio",
        value: data.csat.average.toFixed(1),
        helper: `${data.csat.positiveRate.toFixed(1)}% positivas de ${data.csat.total} avaliações. Escala de 1 a 5.`,
        status: data.csat.average >= 4 ? "success" : data.csat.average >= 3 ? "warning" : "danger",
        row: 2,
      },
      {
        id: "csat-positive",
        label: "Taxa de Satisfação Positiva",
        value: formatPercent(data.csat.positiveRate),
        helper: `Percentual de avaliações 4 ou 5 estrelas. Total: ${data.csat.total} avaliações.`,
        status: data.csat.positiveRate >= 80 ? "success" : data.csat.positiveRate >= 60 ? "warning" : "danger",
        row: 2,
      },
      {
        id: "reopened",
        label: "Taxa de Reabertura",
        value: formatPercent(data.reopenedRate),
        helper: `${data.reopenedCount} tickets reabertos. Meta: abaixo de 5%. Indica qualidade da resolução.`,
        status: data.reopenedRate <= 5 ? "success" : data.reopenedRate <= 10 ? "warning" : "danger",
        row: 2,
      },
      {
        id: "total",
        label: "Total de Tickets",
        value: formatNumber(data.totalTickets),
        helper: "Volume total de tickets no período selecionado. Usado como base para os demais cálculos.",
        status: "neutral",
        row: 2,
      },
    ];
  }, [data]);

  // Formatar data para exibição
  const formatDateDisplay = (dateStr: string): string => {
    const date = new Date(dateStr + "T12:00:00");
    return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
  };

  const [activeQuickRange, setActiveQuickRange] = useState<string>("7");

  // Atualizar handleQuickRange para setar o range ativo
  const handleQuickRangeWithActive = (range: string) => {
    handleQuickRange(range);
    setActiveQuickRange(range);
  };

  return (
    <div className="space-y-6">
      {/* Header com Filtros Integrados */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="rounded-2xl bg-gradient-to-br from-indigo-800 via-indigo-700 to-purple-800 p-6 text-white shadow-xl"
      >
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          {/* Título */}
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 backdrop-blur">
              <Gauge className="h-6 w-6 text-indigo-300" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Painel de KPIs</h1>
              <p className="text-sm text-indigo-100">FCR, FLR, SLA, CSAT e métricas de qualidade</p>
            </div>
          </div>

          {/* Filtros Inline */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Período Rápido */}
            <div className="flex rounded-lg bg-white/10 p-1">
              {[
                { key: "today", label: "Hoje" },
                { key: "7", label: "7 dias" },
                { key: "15", label: "15 dias" },
                { key: "30", label: "30 dias" },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => handleQuickRangeWithActive(key)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                    activeQuickRange === key
                      ? "bg-white text-indigo-900 shadow"
                      : "text-indigo-200 hover:text-white hover:bg-white/10"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Datas */}
            <div className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5">
              <Calendar className="h-4 w-4 text-indigo-300" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => { setStartDate(e.target.value); setActiveQuickRange(""); }}
                className="bg-transparent text-sm text-white border-none outline-none w-28 [color-scheme:dark]"
              />
              <span className="text-indigo-400">→</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => { setEndDate(e.target.value); setActiveQuickRange(""); }}
                className="bg-transparent text-sm text-white border-none outline-none w-28 [color-scheme:dark]"
              />
            </div>

            {/* Grupo */}
            <div className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5">
              <Users className="h-4 w-4 text-indigo-300" />
              <select
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
                className="bg-transparent text-sm text-white border-none outline-none cursor-pointer"
              >
                <option value="Todos" className="text-slate-900">Todos os Grupos</option>
                {filteredGroups.map((group) => (
                  <option key={group.id} value={String(group.id)} className="text-slate-900">
                    {group.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Botão Buscar */}
            <button
              onClick={handleSearch}
              disabled={isLoading}
              className="flex items-center gap-2 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 hover:bg-indigo-400 transition-all disabled:opacity-50"
            >
              <Search className="h-4 w-4" />
              {isLoading ? "Buscando..." : "Buscar"}
            </button>
          </div>
        </div>

        {/* Info do período */}
        <div className="mt-4 flex items-center gap-2 text-xs text-indigo-300">
          <Calendar className="h-3.5 w-3.5" />
          <span>Período: {formatDateDisplay(startDate)} até {formatDateDisplay(endDate)}</span>
          {selectedGroup !== "Todos" && (
            <>
              <span className="mx-2">•</span>
              <Users className="h-3.5 w-3.5" />
              <span>Grupo: {filteredGroups.find(g => String(g.id) === selectedGroup)?.name}</span>
            </>
          )}
        </div>
      </motion.div>

      {/* Aviso de performance */}
      <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-4 py-2 text-xs text-amber-700">
        <AlertTriangle className="h-4 w-4 text-amber-500" />
        <span>Para melhor desempenho, evite buscas com períodos acima de 30 dias.</span>
      </div>

      {/* Loading */}
      {isLoading && !data && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3">
          <p className="text-sm font-semibold text-red-800">
            Erro ao carregar KPIs: {error}
          </p>
        </div>
      )}

      {!data && !isLoading && !error && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center rounded-2xl bg-white p-12 text-center shadow-sm border border-slate-100"
        >
          <Gauge className="h-12 w-12 text-slate-300 mb-4" />
          <h3 className="text-lg font-semibold text-slate-700">Selecione o período</h3>
          <p className="mt-2 text-sm text-slate-500">
            Escolha as datas e clique em "Buscar" para visualizar os KPIs
          </p>
        </motion.div>
      )}

      {data && (
          <>
            {/* ========== SEÇÃO 1: EFICIÊNCIA OPERACIONAL ========== */}
            <motion.section
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.5 }}
              className="mt-10 space-y-4"
            >
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-400 mb-4">
                <TrendingUp className="h-4 w-4" />
                Eficiência Operacional
              </div>
              
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {kpiCards.filter(c => c.row === 1).map(card => (
                  <div
                    key={card.id}
                    className="group relative h-28 [perspective:1000px]"
                  >
                    <div className="relative h-full w-full transition-transform duration-500 [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)]">
                      {/* Frente */}
                      <div className="absolute inset-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm [backface-visibility:hidden]">
                        <p className="text-xs font-medium text-slate-500 mb-3">
                          {card.label}
                        </p>
                        <div className="flex items-baseline gap-2">
                          <p className="text-2xl font-bold text-slate-900">{card.value}</p>
                          {card.status && card.status !== "neutral" && (
                            <span className={`text-xs font-semibold ${
                              card.status === "success" ? "text-emerald-600" : 
                              card.status === "warning" ? "text-amber-600" : "text-red-600"
                            }`}>
                              {card.status === "success" ? "↑" : card.status === "danger" ? "↓" : "→"}
                            </span>
                          )}
                        </div>
                      </div>
                      {/* Verso */}
                      <div className="absolute inset-0 rounded-2xl border border-blue-200 bg-blue-50 p-4 shadow-sm [backface-visibility:hidden] [transform:rotateY(180deg)] flex flex-col justify-center">
                        <p className="text-xs font-semibold text-blue-900 mb-1">{card.label}</p>
                        <p className="text-xs text-blue-700 leading-relaxed">{card.helper}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.section>

            {/* ========== SEÇÃO 2: QUALIDADE E SATISFAÇÃO ========== */}
            <motion.section
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="mt-8 space-y-4"
            >
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-400 mb-4">
                <Star className="h-4 w-4" />
                Qualidade & Satisfação
              </div>
              
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {kpiCards.filter(c => c.row === 2).map(card => (
                  <div
                    key={card.id}
                    className="group relative h-28 [perspective:1000px]"
                  >
                    <div className="relative h-full w-full transition-transform duration-500 [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)]">
                      {/* Frente */}
                      <div className="absolute inset-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm [backface-visibility:hidden]">
                        <p className="text-xs font-medium text-slate-500 mb-3">
                          {card.label}
                        </p>
                        <div className="flex items-baseline gap-2">
                          <p className="text-2xl font-bold text-slate-900">{card.value}</p>
                          {card.status && card.status !== "neutral" && (
                            <span className={`text-xs font-semibold ${
                              card.status === "success" ? "text-emerald-600" : 
                              card.status === "warning" ? "text-amber-600" : "text-red-600"
                            }`}>
                              {card.status === "success" ? "↑" : card.status === "danger" ? "↓" : "→"}
                            </span>
                          )}
                        </div>
                      </div>
                      {/* Verso */}
                      <div className="absolute inset-0 rounded-2xl border border-blue-200 bg-blue-50 p-4 shadow-sm [backface-visibility:hidden] [transform:rotateY(180deg)] flex flex-col justify-center">
                        <p className="text-xs font-semibold text-blue-900 mb-1">{card.label}</p>
                        <p className="text-xs text-blue-700 leading-relaxed">{card.helper}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.section>

            {/* ========== SEÇÃO 3: FÓRMULAS ========== */}
            <motion.section
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="mt-8"
            >
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-400 mb-4">
                <Calculator className="h-4 w-4" />
                Referência de Fórmulas
              </div>
              
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-xs font-semibold text-slate-700 mb-2">FCR - First Contact Resolution</p>
                  <p className="text-xs text-slate-500 font-mono bg-slate-50 p-2 rounded">
                    (Incidentes Resolvidos no 1º Contato / Total de Contatos) × 100
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-xs font-semibold text-slate-700 mb-2">FLR - First Level Resolution</p>
                  <p className="text-xs text-slate-500 font-mono bg-slate-50 p-2 rounded">
                    (Incidentes Resolvidos pelo N1 / Total de Incidentes) × 100
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-xs font-semibold text-slate-700 mb-2">SLA Compliance</p>
                  <p className="text-xs text-slate-500 font-mono bg-slate-50 p-2 rounded">
                    (Tickets Dentro do SLA / Total de Tickets) × 100
                  </p>
                </div>
              </div>
            </motion.section>

            <p className="text-xs text-slate-400 mt-6 text-center">
              Passe o cursor sobre os cards para ver informações detalhadas.
            </p>
          </>
        )}
    </div>
  );
}