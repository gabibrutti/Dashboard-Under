import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Phone, PhoneIncoming, PhoneMissed, BarChart3, Calendar, Search, Clock, PhoneOutgoing } from "lucide-react";
import { ChartCard, DistributionBarChart, type SimpleDatum } from "@/components/charts/ChartCards";

interface CallData {
  id: string;
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number;
  talkTimeSeconds: number;
  queueId: string;
  queueName?: string;
  status: string;
  direction: string;
  abandoned: boolean;
  answered: boolean;
  extension?: string;
  ramal?: string;
}

type RamalMetrics = {
  ramal: string;
  total: number;
  answered: number;
  abandoned: number;
  avgDurationSeconds: number;
  abandonmentRate: number;
};

const TARGET_QUEUE_ID = "8424450";
const TARGET_QUEUE_NAME = "Servidores Clouds e Dedicados - 77";

function formatDuration(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

export default function TelephonyQueue8424450Page() {
  const today = new Date().toISOString().split("T")[0];
  const sevenDaysAgo = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const [startDate, setStartDate] = useState<string>(sevenDaysAgo);
  const [endDate, setEndDate] = useState<string>(today);
  const [calls, setCalls] = useState<CallData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeQuickRange, setActiveQuickRange] = useState<string>("7");

  // Buscar chamadas cruas
  useEffect(() => {
    async function loadCalls() {
      try {
        setIsLoading(true);
        setError(null);
        const params = new URLSearchParams({ startDate, endDate });
        const baseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined) || (import.meta.env.DEV ? "${baseUrl}" : "");
        const res = await fetch(`${baseUrl}/api/calls?${params.toString()}`);
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: "Erro ao carregar chamadas" }));
          throw new Error(err.error || "Erro ao carregar chamadas");
        }
        const data = await res.json();
        setCalls(data as CallData[]);
      } catch (err: any) {
        console.error("Erro ao carregar chamadas:", err);
        setError(err.message || "Erro ao carregar chamadas");
        setCalls([]);
      } finally {
        setIsLoading(false);
      }
    }
    loadCalls();
  }, [startDate, endDate]);

  // Filtro fixo por fila 8424450 / nome específico
  const filteredCalls = useMemo(() => {
    return calls.filter(call =>
      call.queueId === TARGET_QUEUE_ID || call.queueName === TARGET_QUEUE_NAME,
    );
  }, [calls]);

  // Métricas por ramal
  const ramalMetrics = useMemo((): RamalMetrics[] => {
    const map = new Map<string, RamalMetrics>();

    filteredCalls.forEach(call => {
      const ramal = call.ramal || call.extension || "Sem ramal";
      const current = map.get(ramal) || {
        ramal,
        total: 0,
        answered: 0,
        abandoned: 0,
        avgDurationSeconds: 0,
        abandonmentRate: 0,
      };
      current.total += 1;
      if (call.answered) {
        current.answered += 1;
        current.avgDurationSeconds += call.durationSeconds || 0;
      }
      if (call.abandoned) {
        current.abandoned += 1;
      }
      map.set(ramal, current);
    });

    return Array.from(map.values()).map(item => ({
      ...item,
      avgDurationSeconds: item.answered > 0 ? item.avgDurationSeconds / item.answered : 0,
      abandonmentRate: item.total > 0 ? (item.abandoned / item.total) * 100 : 0,
    })).sort((a, b) => b.total - a.total);
  }, [filteredCalls]);

  const barData: SimpleDatum[] = useMemo(() => {
    return ramalMetrics.slice(0, 12).map(r => ({ name: r.ramal, value: r.total }));
  }, [ramalMetrics]);

  // Quick ranges
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

  const totalCalls = filteredCalls.length;
  const answered = filteredCalls.filter(c => c.answered).length;
  const abandoned = filteredCalls.filter(c => c.abandoned).length;
  const abandonmentRate = totalCalls > 0 ? (abandoned / totalCalls) * 100 : 0;

  return (
    <div className="space-y-8 pb-12">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-900 to-blue-900 p-6 text-white shadow-xl"
      >
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-white/10 backdrop-blur">
              <BarChart3 className="h-7 w-7 text-amber-200" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Desempenho da Fila #8424450</h1>
              <p className="text-sm text-indigo-200">Filtro fixo: ID da Fila #8424450 ou Nome "Servidores Clouds e Dedicados - 77"</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
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
                      ? "bg-white text-indigo-900 shadow"
                      : "text-indigo-200 hover:text-white hover:bg-white/10"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

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

            <button
              onClick={() => handleQuickRange(activeQuickRange || "7")}
              disabled={isLoading}
              className="flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-amber-500/25 hover:bg-amber-400 transition-all disabled:opacity-50"
            >
              <Search className="h-4 w-4" />
              {isLoading ? "Atualizando..." : "Aplicar"}
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-indigo-200">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1">
            <PhoneIncoming className="h-3.5 w-3.5" /> {answered.toLocaleString("pt-BR")} atendidas
          </span>
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1">
            <PhoneMissed className="h-3.5 w-3.5" /> {abandoned.toLocaleString("pt-BR")} perdidas
          </span>
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1">
            <Clock className="h-3.5 w-3.5" /> Abandono: {abandonmentRate.toFixed(1)}%
          </span>
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1">
            <PhoneOutgoing className="h-3.5 w-3.5" /> Total: {totalCalls.toLocaleString("pt-BR")} chamadas
          </span>
        </div>
      </motion.div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-red-700 text-sm">
          {error}
        </div>
      )}

      {isLoading && (
        <div className="flex items-center justify-center py-10">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" />
        </div>
      )}

      {!isLoading && filteredCalls.length === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-slate-600">
          Nenhuma chamada encontrada para a fila 8424450 no período selecionado.
        </div>
      )}

      {!isLoading && filteredCalls.length > 0 && (
        <div className="grid gap-6 lg:grid-cols-2">
          <ChartCard
            title="Total de Ligações por Ramal"
            subtitle="Fila #8424450"
          >
            <DistributionBarChart data={barData} />
          </ChartCard>

          <motion.section
            className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/70"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
          >
            <header className="flex items-start justify-between gap-3 mb-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Detalhamento por Ramal</p>
                <h3 className="mt-1 text-lg font-semibold text-slate-900">TMA e Taxa de Abandono</h3>
              </div>
              <span className="rounded-full bg-slate-50 px-3 py-1 text-xs text-slate-500 border border-slate-200">Base: {filteredCalls.length.toLocaleString("pt-BR")}</span>
            </header>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100 text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-[0.2em] text-slate-500">
                  <tr>
                    <th className="px-3 py-2 text-left">Ramal</th>
                    <th className="px-3 py-2 text-right">Total</th>
                    <th className="px-3 py-2 text-right">Atendidas</th>
                    <th className="px-3 py-2 text-right">Perdidas</th>
                    <th className="px-3 py-2 text-right">TMA</th>
                    <th className="px-3 py-2 text-right">Abandono</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {ramalMetrics.map(row => (
                    <tr key={row.ramal} className="hover:bg-slate-50">
                      <td className="px-3 py-2 font-medium text-slate-900">{row.ramal}</td>
                      <td className="px-3 py-2 text-right text-slate-700">{row.total.toLocaleString("pt-BR")}</td>
                      <td className="px-3 py-2 text-right text-emerald-600">{row.answered.toLocaleString("pt-BR")}</td>
                      <td className="px-3 py-2 text-right text-rose-600">{row.abandoned.toLocaleString("pt-BR")}</td>
                      <td className="px-3 py-2 text-right text-slate-700">{formatDuration(row.avgDurationSeconds)}</td>
                      <td className="px-3 py-2 text-right text-slate-700">{row.abandonmentRate.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.section>
        </div>
      )}
    </div>
  );
}
