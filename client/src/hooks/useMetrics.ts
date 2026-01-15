import { useEffect, useState } from "react";

export type SlaResolutionConfig = {
  urgente: number;
  alta: number;
  media: number;
  baixa: number;
};

export type SlaConfig = {
  firstResponse: number;
  resolution: SlaResolutionConfig;
};

export type MetricsData = {
  ticketsRecebidos: number;
  ticketsResolvidos: number;
  ticketsNaoResolvidos: number;
  slaResolucao: number;
  tempoMedioResolucao: number;
  tempoMedioPrimeiraResposta: number;
  taxaReabertura: number;
  csatMedio: number;
  csatCount: number;
  totalTickets: number;
  groupName?: string | null;
  slaConfig?: SlaConfig;
  cached: boolean;
  stale?: boolean;
  errors: string[] | null;
};

type Filters = {
  startDate: string;
  endDate: string;
  groupId: string | "Todos";
  agentId: string | "Todos";
  autoFetch?: boolean;
};

export function useMetrics(filters: Filters) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<MetricsData | null>(null);

  const { startDate, endDate, groupId, agentId, autoFetch = false } = filters;

  async function fetchMetrics() {
    if (!startDate || !endDate) return;

    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams({ startDate, endDate });

      if (groupId && groupId !== "Todos") {
        params.append("groupId", groupId);
      }

      if (agentId && agentId !== "Todos") {
        params.append("agentId", agentId);
      }

      const baseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined) || (import.meta.env.DEV ? "${baseUrl}" : "");
      const res = await fetch(`${baseUrl}/api/metrics?${params.toString()}`, {
        cache: "no-store",
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({ error: "Erro desconhecido" }));
        throw new Error(errBody.error || "Erro ao carregar métricas");
      }

      const data: MetricsData = await res.json();
      setMetrics(data);

      // Se veio do cache expirado (stale), mostrar aviso
      if (data.stale) {
        setError("Freshservice limitou requisições, exibindo últimos dados disponíveis (atualização em até 2 min)");
      } else if (data.cached) {
        // Cache válido, sem erro
        setError(null);
      }
    } catch (err: any) {
      console.error("[useMetrics] Erro:", err);
      setError(err.message || "Erro ao carregar métricas");
    } finally {
      setIsLoading(false);
    }
  }

  // Auto-fetch apenas se autoFetch=true
  useEffect(() => {
    if (autoFetch && startDate && endDate) {
      fetchMetrics();
    }
  }, [autoFetch, startDate, endDate, groupId, agentId]);

  return {
    isLoading,
    error,
    metrics,
    fetchMetrics,
  };
}
