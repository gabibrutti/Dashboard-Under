import { useCallback, useState, useEffect } from "react";
import type { HdiSccMetrics } from "@/types/dashboard";

export function useHdiSccMetrics({
  startDate,
  endDate,
  groupId,
  agentId,
  autoFetch = false,
}: {
  startDate: string;
  endDate: string;
  groupId: string | "Todos";
  agentId: string | "Todos";
  autoFetch?: boolean;
}) {
  const [data, setData] = useState<HdiSccMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = useCallback(async () => {
    if (!startDate || !endDate) {
      setError("Selecione as datas de início e fim");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams({ startDate, endDate });

      if (groupId && groupId !== "Todos") params.append("groupId", groupId);
      if (agentId && agentId !== "Todos") params.append("agentId", agentId);

      // Usar URL direta do backend para evitar problemas de proxy
      const baseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined) || (import.meta.env.DEV ? "${baseUrl}" : "");
      const res = await fetch(`${baseUrl}/api/hdi-scc-metrics?${params.toString()}`);

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Erro desconhecido ao carregar métricas HDI-SCC" }));
        throw new Error(err.error || "Erro ao carregar métricas HDI-SCC");
      }
      
      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        throw new Error("Resposta inválida do servidor ao carregar métricas HDI-SCC");
      }
      
      const json = await res.json();
      setData(json as HdiSccMetrics);
    } catch (err: any) {
      console.error("[Hook] Erro ao carregar métricas HDI-SCC:", err);
      setError(err.message || "Erro ao carregar métricas HDI-SCC");
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate, groupId, agentId]);

  // Auto-fetch quando autoFetch=true e datas estão definidas
  useEffect(() => {
    if (autoFetch && startDate && endDate) {
      fetchMetrics();
    }
  }, [autoFetch, startDate, endDate, groupId, agentId, fetchMetrics]);

  return { data, isLoading, error, fetchMetrics };
}
