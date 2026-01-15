import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Calendar, Users, Trophy, Clock, Target, AlertTriangle, Search, TrendingUp } from "lucide-react";
import { useAnalystMetrics } from "@/hooks/useAnalystMetrics";

interface Group {
  id: number;
  name: string;
}

// Formatar minutos para exibição
function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)}min`;
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (hours < 24) return `${hours}h ${mins}min`;
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return `${days}d ${remainingHours}h`;
}

// Formatar data para exibição
function formatDateDisplay(dateStr: string): string {
  const date = new Date(dateStr + "T12:00:00");
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

export default function TeamPage() {
  // Estados de filtros
  const today = new Date().toISOString().split("T")[0];
  const sevenDaysAgo = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const [startDate, setStartDate] = useState<string>(sevenDaysAgo);
  const [endDate, setEndDate] = useState<string>(today);
  const [selectedGroup, setSelectedGroup] = useState<string>("Todos");
  const [groups, setGroups] = useState<Group[]>([]);
  const [activeQuickRange, setActiveQuickRange] = useState<string>("7");

  // Carregar grupos
  useEffect(() => {
    async function loadGroups() {
      try {
        const baseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined) || (import.meta.env.DEV ? "${baseUrl}" : "");
        const res = await fetch(`${baseUrl}/api/groups`);
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

  // Buscar métricas de analistas (apenas ao clicar em Buscar)
  const { data, isLoading, error, fetchMetrics } = useAnalystMetrics({
    startDate,
    endDate,
    groupId: selectedGroup,
    autoFetch: false,
  });

  // Função para períodos rápidos
  const handleQuickRange = (range: string) => {
    const todayDate = new Date();
    let start = new Date();

    switch (range) {
      case "today":
        start = todayDate;
        break;
      case "7":
        start.setDate(todayDate.getDate() - 6);
        break;
      case "15":
        start.setDate(todayDate.getDate() - 14);
        break;
      case "30":
        start.setDate(todayDate.getDate() - 29);
        break;
    }

    setStartDate(start.toISOString().split("T")[0]);
    setEndDate(todayDate.toISOString().split("T")[0]);
    setActiveQuickRange(range);
  };

  // Top 3 analistas para o pódio
  const topAnalysts = useMemo(() => {
    if (!data?.analysts) return [];
    return data.analysts.slice(0, 3);
  }, [data]);

  // Todos os analistas para a tabela
  const allAnalysts = useMemo(() => {
    if (!data?.analysts) return [];
    return data.analysts;
  }, [data]);

  return (
    <div className="space-y-6">
      {/* Header com Filtros Integrados */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="rounded-2xl bg-gradient-to-br from-slate-800 via-slate-700 to-slate-800 p-6 text-white shadow-xl"
      >
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          {/* Título */}
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 backdrop-blur">
              <TrendingUp className="h-6 w-6 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Performance dos Analistas</h1>
              <p className="text-sm text-slate-200">Ranking e métricas individuais</p>
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
                  onClick={() => handleQuickRange(key)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                    activeQuickRange === key
                      ? "bg-white text-slate-900 shadow"
                      : "text-slate-300 hover:text-white hover:bg-white/10"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Datas */}
            <div className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5">
              <Calendar className="h-4 w-4 text-slate-400" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => { setStartDate(e.target.value); setActiveQuickRange(""); }}
                className="bg-transparent text-sm text-white border-none outline-none w-28 [color-scheme:dark]"
              />
              <span className="text-slate-500">→</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => { setEndDate(e.target.value); setActiveQuickRange(""); }}
                className="bg-transparent text-sm text-white border-none outline-none w-28 [color-scheme:dark]"
              />
            </div>

            {/* Grupo */}
            <div className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5">
              <Users className="h-4 w-4 text-slate-400" />
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
              onClick={fetchMetrics}
              disabled={isLoading}
              className="flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 hover:bg-emerald-400 transition-all disabled:opacity-50"
            >
              <Search className="h-4 w-4" />
              {isLoading ? "Buscando..." : "Buscar"}
            </button>
          </div>
        </div>

        {/* Info do período */}
        <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
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

      {/* Aviso de performance - mais discreto */}
      <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-4 py-2 text-xs text-amber-700">
        <AlertTriangle className="h-4 w-4 text-amber-500" />
        <span>Para melhor desempenho, evite buscas com períodos acima de 30 dias.</span>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3">
          <p className="text-sm font-semibold text-red-800">{error}</p>
        </div>
      )}

      {/* Conteúdo */}
      {!isLoading && !error && data && (
        <>
          {/* Resumo - Cards modernos */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl bg-white p-5 shadow-sm border border-slate-100"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">Total Analistas</p>
                  <p className="text-2xl font-bold text-slate-900">{data.totalAnalysts}</p>
                </div>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="rounded-xl bg-white p-5 shadow-sm border border-slate-100"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
                  <Target className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">Total Tickets</p>
                  <p className="text-2xl font-bold text-slate-900">{data.totalTickets}</p>
                </div>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="rounded-xl bg-white p-5 shadow-sm border border-slate-100"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50">
                  <TrendingUp className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">Média/Analista</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {data.totalAnalysts > 0 ? Math.round(data.totalTickets / data.totalAnalysts) : 0}
                  </p>
                </div>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="rounded-xl bg-white p-5 shadow-sm border border-slate-100"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50">
                  <Trophy className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">Grupo</p>
                  <p className="text-lg font-bold text-slate-900 truncate">
                    {selectedGroup === "Todos" ? "Todos" : filteredGroups.find(g => String(g.id) === selectedGroup)?.name || "—"}
                  </p>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Pódio - Top 3 */}
          {topAnalysts.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <Trophy className="h-5 w-5 text-amber-500" />
                Top 3 Analistas
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {topAnalysts.map((analyst, index) => (
                  <motion.div
                    key={analyst.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                    className={`relative overflow-hidden rounded-xl p-5 shadow-sm ${
                      index === 0 ? "bg-gradient-to-br from-amber-400 to-amber-500 text-white" :
                      index === 1 ? "bg-gradient-to-br from-slate-300 to-slate-400 text-slate-900" :
                      "bg-gradient-to-br from-orange-300 to-orange-400 text-slate-900"
                    }`}
                  >
                    <div className="absolute top-3 right-3 text-5xl font-black opacity-20">
                      #{index + 1}
                    </div>
                    <div className="relative">
                      <Trophy className={`h-8 w-8 mb-3 ${index === 0 ? "text-white" : "text-slate-700"}`} />
                      <h3 className="text-lg font-bold truncate">{analyst.name}</h3>
                      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                        <div>
                          <p className={`text-xs ${index === 0 ? "text-amber-100" : "text-slate-600"}`}>Resolvidos</p>
                          <p className="text-lg font-bold">{analyst.resolved}</p>
                        </div>
                        <div>
                          <p className={`text-xs ${index === 0 ? "text-amber-100" : "text-slate-600"}`}>SLA</p>
                          <p className="text-lg font-bold">{analyst.slaPercent}%</p>
                        </div>
                        <div>
                          <p className={`text-xs ${index === 0 ? "text-amber-100" : "text-slate-600"}`}>Tempo</p>
                          <p className="text-sm font-bold">{formatMinutes(analyst.avgResolutionMinutes)}</p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </section>
          )}

          {/* Tabela completa */}
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">Todos os Analistas</h2>
            <div className="overflow-hidden rounded-xl bg-white shadow-sm border border-slate-100">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50">
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">#</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Analista</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">Total</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">Resolvidos</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">SLA %</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">Reabertos</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">Tempo Médio</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">1ª Resposta</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {allAnalysts.map((analyst, index) => (
                      <tr key={analyst.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3 text-sm font-bold text-slate-400">{index + 1}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                              {analyst.name.split(" ").map(n => n[0]).slice(0, 2).join("")}
                            </div>
                            <span className="text-sm font-medium text-slate-900">{analyst.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-slate-600">{analyst.total}</td>
                        <td className="px-4 py-3 text-center text-sm font-semibold text-slate-900">{analyst.resolved}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            analyst.slaPercent >= 90 ? "bg-emerald-100 text-emerald-700" :
                            analyst.slaPercent >= 75 ? "bg-amber-100 text-amber-700" :
                            "bg-red-100 text-red-700"
                          }`}>
                            {analyst.slaPercent}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-sm">
                          {analyst.reopened > 0 ? (
                            <span className="inline-flex items-center gap-1 text-amber-600">
                              <AlertTriangle className="h-3.5 w-3.5" />
                              {analyst.reopened}
                            </span>
                          ) : (
                            <span className="text-slate-400">0</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-slate-600">
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5 text-slate-400" />
                            {formatMinutes(analyst.avgResolutionMinutes)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-slate-600">
                          <span className="inline-flex items-center gap-1">
                            <Target className="h-3.5 w-3.5 text-slate-400" />
                            {formatMinutes(analyst.avgFirstResponseMinutes)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {allAnalysts.length === 0 && (
                <div className="px-4 py-12 text-center text-slate-500">
                  <Users className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                  <p className="font-medium">Nenhum analista encontrado</p>
                  <p className="text-sm text-slate-400 mt-1">Tente ajustar o período ou grupo selecionado</p>
                </div>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
