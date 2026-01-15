import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Phone, PhoneIncoming, PhoneOutgoing, PhoneMissed, Clock, Calendar, Search, TrendingUp, Users } from "lucide-react";

interface CallData {
  id: string;
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number;
  status: string;
  statusDestino?: string;
  direction: string;
  abandoned: boolean;
  answered: boolean;
  talkTimeSeconds: number;
  destinationNumber?: string;
  queueId?: string;
  queueName?: string;
}

// Formatar duração
function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  if (minutes < 60) return `${minutes}m ${secs}s`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
}

// Formatar data para exibição
function formatDateDisplay(dateStr: string): string {
  const date = new Date(dateStr + "T12:00:00");
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

export default function TelephonyPage() {
  // Estados
  const today = new Date().toISOString().split("T")[0];
  const sevenDaysAgo = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const [startDate, setStartDate] = useState<string>(sevenDaysAgo);
  const [endDate, setEndDate] = useState<string>(today);
  const [calls, setCalls] = useState<CallData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeQuickRange, setActiveQuickRange] = useState<string>("7");

  // Buscar chamadas
  const fetchCalls = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams({
        startDate,
        endDate,
        queueId: "8424450",
        queueName: "Servidores Clouds e Dedicados - 77",
      });
      const baseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined) || (import.meta.env.DEV ? "${baseUrl}" : "");
      
      const res = await fetch(`${baseUrl}/api/calls?${params.toString()}`);
      
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Erro ao carregar chamadas" }));
        throw new Error(err.error || "Erro ao carregar chamadas");
      }
      
      const data = await res.json();
      setCalls(data);
    } catch (err: any) {
      console.error("Erro ao carregar chamadas:", err);
      setError(err.message || "Erro ao carregar chamadas");
    } finally {
      setIsLoading(false);
    }
  };

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

  // Métricas calculadas
  const metrics = useMemo(() => {
    // Apenas chamadas recebidas da fila (DID da URA) e inbound
    const inbound = calls.filter(
      (c) =>
        c.direction === "inbound" &&
        c.destinationNumber === "551141182199"
    );

    const total = inbound.length;
    const received = total;
    const made = 0; // não mostramos outbound neste painel

    const answeredCalls = inbound.filter(
      (c) =>
        c.answered === true ||
        c.statusDestino === "atendida" ||
        (c.talkTimeSeconds ?? 0) > 0 ||
        (c.durationSeconds ?? 0) > 0
    );
    const answered = answeredCalls.length;
    const missed = Math.max(received - answered, 0);

    const totalDuration = answeredCalls.reduce((acc, c) => acc + (c.durationSeconds || 0), 0);
    const totalTalkTime = answeredCalls.reduce((acc, c) => acc + (c.talkTimeSeconds || 0), 0);
    const avgDuration = answeredCalls.length > 0 ? totalDuration / answeredCalls.length : 0;
    const avgTalkTime = answeredCalls.length > 0 ? totalTalkTime / answeredCalls.length : 0;

    const abandonmentRate = received > 0 ? (missed / received) * 100 : 0;
    const answerRate = received > 0 ? (answered / received) * 100 : 0;

    console.log("[Telefonia] Métricas calculadas (fila 8424450 inbound):", {
      received,
      answered,
      missed,
      avgDuration,
      avgTalkTime,
      abandonmentRate,
      answerRate,
    });

    return {
      total,
      received,
      made,
      missed,
      answered,
      avgDuration,
      avgTalkTime,
      abandonmentRate,
      answerRate,
    };
  }, [calls]);

  // Cards com explicações
  const callCards = [
    {
      id: "received",
      label: "Ligações Recebidas",
      value: metrics.received,
      icon: PhoneIncoming,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      helper: "Total de ligações recebidas pela URA 44165 (Central de Serviços HC - Suporte). Inclui todas as chamadas que entraram na fila de atendimento.",
    },
    {
      id: "answered",
      label: "Ligações Atendidas",
      value: metrics.answered,
      icon: Phone,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
      helper: "Ligações que foram efetivamente atendidas por um analista. Quanto maior esse número em relação às recebidas, melhor a taxa de atendimento.",
    },
    {
      id: "missed",
      label: "Ligações Perdidas",
      value: metrics.missed,
      icon: PhoneMissed,
      color: "text-red-600",
      bgColor: "bg-red-50",
      helper: "Ligações que foram abandonadas pelo cliente antes de serem atendidas. Meta: manter abaixo de 5% do total de recebidas.",
    },
    {
      id: "made",
      label: "Ligações Realizadas",
      value: metrics.made,
      icon: PhoneOutgoing,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      helper: "Total de ligações realizadas (outbound) pelos analistas do suporte. Inclui retornos e ligações ativas.",
    },
  ];

  const performanceCards = [
    {
      id: "answerRate",
      label: "Taxa de Atendimento",
      value: `${metrics.answerRate.toFixed(1)}%`,
      icon: TrendingUp,
      color: metrics.answerRate >= 90 ? "text-emerald-600" : metrics.answerRate >= 75 ? "text-amber-600" : "text-red-600",
      bgColor: metrics.answerRate >= 90 ? "bg-emerald-50" : metrics.answerRate >= 75 ? "bg-amber-50" : "bg-red-50",
      helper: "Percentual de ligações recebidas que foram atendidas. Fórmula: (Atendidas / Recebidas) × 100. Meta: acima de 90%.",
    },
    {
      id: "abandonmentRate",
      label: "Taxa de Abandono",
      value: `${metrics.abandonmentRate.toFixed(1)}%`,
      icon: PhoneMissed,
      color: metrics.abandonmentRate <= 5 ? "text-emerald-600" : metrics.abandonmentRate <= 10 ? "text-amber-600" : "text-red-600",
      bgColor: metrics.abandonmentRate <= 5 ? "bg-emerald-50" : metrics.abandonmentRate <= 10 ? "bg-amber-50" : "bg-red-50",
      helper: "Percentual de ligações abandonadas antes do atendimento. Fórmula: (Perdidas / Recebidas) × 100. Meta: abaixo de 5%.",
    },
    {
      id: "avgDuration",
      label: "Duração Média",
      value: formatDuration(metrics.avgDuration),
      icon: Clock,
      color: "text-slate-600",
      bgColor: "bg-slate-50",
      helper: "Tempo médio total das ligações, incluindo tempo de espera e tempo de conversa. Ajuda a dimensionar a capacidade da equipe.",
    },
    {
      id: "avgTalkTime",
      label: "Tempo Médio de Conversa",
      value: formatDuration(metrics.avgTalkTime),
      icon: Users,
      color: "text-indigo-600",
      bgColor: "bg-indigo-50",
      helper: "Tempo médio efetivo de conversa entre analista e cliente. Não inclui tempo de espera na fila.",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header com Filtros */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="rounded-2xl bg-gradient-to-br from-green-800 via-green-700 to-teal-800 p-6 text-white shadow-xl"
      >
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          {/* Título */}
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 backdrop-blur">
              <Phone className="h-6 w-6 text-green-300" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Telefonia - Central de Serviços</h1>
              <p className="text-sm text-green-100">URA 44165 - Suporte HC (ligações exclusivas do suporte)</p>
            </div>
          </div>

          {/* Filtros */}
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
                      ? "bg-white text-green-900 shadow"
                      : "text-green-100 hover:text-white hover:bg-white/10"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Datas */}
            <div className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5">
              <Calendar className="h-4 w-4 text-green-300" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => { setStartDate(e.target.value); setActiveQuickRange(""); }}
                className="bg-transparent text-sm text-white border-none outline-none w-28 [color-scheme:dark]"
              />
              <span className="text-green-400">→</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => { setEndDate(e.target.value); setActiveQuickRange(""); }}
                className="bg-transparent text-sm text-white border-none outline-none w-28 [color-scheme:dark]"
              />
            </div>

            {/* Botão Buscar */}
            <button
              onClick={fetchCalls}
              disabled={isLoading}
              className="flex items-center gap-2 rounded-lg bg-green-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-green-500/25 hover:bg-green-400 transition-all disabled:opacity-50"
            >
              <Search className="h-4 w-4" />
              {isLoading ? "Buscando..." : "Buscar"}
            </button>
          </div>
        </div>

        {/* Info do período */}
        <div className="mt-4 flex items-center gap-2 text-xs text-green-200">
          <Calendar className="h-3.5 w-3.5" />
          <span>Período: {formatDateDisplay(startDate)} até {formatDateDisplay(endDate)}</span>
          <span className="mx-2">•</span>
          <Phone className="h-3.5 w-3.5" />
          <span>URA: 44165 - Central de Serviços HC (Suporte)</span>
        </div>
      </motion.div>


      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3">
          <p className="text-sm font-semibold text-red-800">{error}</p>
        </div>
      )}

      {/* Mensagem inicial */}
      {!isLoading && !error && calls.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center rounded-2xl bg-white p-12 text-center shadow-sm border border-slate-100"
        >
          <Phone className="h-12 w-12 text-slate-300 mb-4" />
          <h3 className="text-lg font-semibold text-slate-700">Selecione o período</h3>
          <p className="mt-2 text-sm text-slate-500">
            Escolha as datas e clique em "Buscar" para visualizar as métricas de telefonia
          </p>
        </motion.div>
      )}

      {/* Conteúdo */}
      {!isLoading && !error && calls.length > 0 && (
        <>
          {/* Cards de Volume */}
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <Phone className="h-5 w-5 text-green-600" />
              Volume de Ligações
            </h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {callCards.map((card, index) => (
                <motion.div
                  key={card.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="group relative h-32 [perspective:1000px]"
                >
                  <div className="relative h-full w-full transition-transform duration-500 [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)]">
                    {/* Frente */}
                    <div className="absolute inset-0 rounded-xl bg-white p-5 shadow-sm border border-slate-100 [backface-visibility:hidden]">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${card.bgColor}`}>
                          <card.icon className={`h-5 w-5 ${card.color}`} />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-slate-500">{card.label}</p>
                          <p className="text-2xl font-bold text-slate-900">{card.value}</p>
                        </div>
                      </div>
                    </div>
                    {/* Verso */}
                    <div className="absolute inset-0 rounded-xl bg-slate-800 p-4 shadow-sm [backface-visibility:hidden] [transform:rotateY(180deg)] flex flex-col justify-center">
                      <p className="text-xs font-semibold text-white mb-1">{card.label}</p>
                      <p className="text-xs text-slate-300 leading-relaxed">{card.helper}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>

          {/* Cards de Performance */}
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-indigo-600" />
              Indicadores de Performance
            </h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {performanceCards.map((card, index) => (
                <motion.div
                  key={card.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="group relative h-32 [perspective:1000px]"
                >
                  <div className="relative h-full w-full transition-transform duration-500 [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)]">
                    {/* Frente */}
                    <div className="absolute inset-0 rounded-xl bg-white p-5 shadow-sm border border-slate-100 [backface-visibility:hidden]">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${card.bgColor}`}>
                          <card.icon className={`h-5 w-5 ${card.color}`} />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-slate-500">{card.label}</p>
                          <p className="text-2xl font-bold text-slate-900">{card.value}</p>
                        </div>
                      </div>
                    </div>
                    {/* Verso */}
                    <div className="absolute inset-0 rounded-xl bg-slate-800 p-4 shadow-sm [backface-visibility:hidden] [transform:rotateY(180deg)] flex flex-col justify-center">
                      <p className="text-xs font-semibold text-white mb-1">{card.label}</p>
                      <p className="text-xs text-slate-300 leading-relaxed">{card.helper}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>

          {/* Resumo */}
          <section className="rounded-xl bg-white p-6 shadow-sm border border-slate-100">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Resumo do Período</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <p className="text-xs font-medium text-slate-500">Total de Ligações</p>
                <p className="text-3xl font-bold text-slate-900">{metrics.total}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">Recebidas vs Realizadas</p>
                <p className="text-lg font-bold text-slate-900">
                  <span className="text-blue-600">{metrics.received}</span>
                  <span className="text-slate-400 mx-2">/</span>
                  <span className="text-purple-600">{metrics.made}</span>
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">Atendidas vs Perdidas</p>
                <p className="text-lg font-bold text-slate-900">
                  <span className="text-emerald-600">{metrics.answered}</span>
                  <span className="text-slate-400 mx-2">/</span>
                  <span className="text-red-600">{metrics.missed}</span>
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">Taxa de Sucesso</p>
                <p className={`text-3xl font-bold ${metrics.answerRate >= 90 ? "text-emerald-600" : metrics.answerRate >= 75 ? "text-amber-600" : "text-red-600"}`}>
                  {metrics.answerRate.toFixed(0)}%
                </p>
              </div>
            </div>
          </section>

          <p className="text-xs text-slate-400 text-center">
            Passe o cursor sobre os cards para ver informações detalhadas.
          </p>
        </>
      )}
    </div>
  );
}
