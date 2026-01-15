import { useEffect, useState } from "react";
import { apiUrl } from "@/config/api";

type Filters = {
  startDate: string;  // "YYYY-MM-DD"
  endDate: string;    // "YYYY-MM-DD"
  groupId: string | "Todos";
  agentId: string | "Todos";
};

type Credentials = {
  freshserviceApiKey: string;
  freshserviceDomain: string;
  zenviaApiToken: string;
};

export type Group = {
  id: number;
  name: string;
};

export type Agent = {
  id: number;
  name: string;
  email?: string;
  primary_group_id?: number;
  group_ids?: number[];
};

export type Call = {
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
};

export function useRealDashboardData(filters: Filters, credentials: Credentials | null) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [calls, setCalls] = useState<Call[]>([]);

  const { startDate, endDate, groupId, agentId } = filters;

  // Buscar grupos ao montar
  useEffect(() => {
    async function loadGroups() {
      try {
        const res = await fetch(apiUrl("/api/groups"), { cache: "no-store" });
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: "Erro desconhecido ao carregar grupos" }));
          throw new Error(err.error || "Erro ao carregar grupos");
        }
        if (res.status === 304) {
          // Sem conteúdo novo, manter grupos atuais
          return;
        }
        const contentType = res.headers.get("content-type") || "";
        if (!contentType.includes("application/json")) {
          throw new Error("Resposta inválida do servidor ao carregar grupos");
        }
        const data = await res.json();
        setGroups(data);
      } catch (err: any) {
        console.error("[Hook] Erro ao carregar grupos:", err);
        // Fallback local de grupos básicos para não travar o seletor
        setGroups([
          { id: 37000043862, name: "Suporte" },
          { id: 37000153628, name: "Field" },
          { id: 37000171279, name: "NOC" },
          { id: 37000175476, name: "Delivery" },
        ]);
        setError(err.message || "Erro ao carregar grupos");
      }
    }
    loadGroups();
  }, []);

  // Buscar agentes quando groupId mudar
  useEffect(() => {
    async function loadAgents() {
      try {
        setIsLoading(true);
        setError(null);

        const url = groupId === "Todos" 
          ? apiUrl("/api/agents")
          : apiUrl(`/api/agents?groupId=${groupId}`);

        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: "Erro desconhecido ao carregar agentes" }));
          const message = err.error || "Erro ao carregar agentes";

          // Fallback de agentes em caso de 429 usando /data.json
          if (message.includes("429")) {
            console.warn("[Hook] Freshservice rate limit ao carregar agentes. Usando /data.json como fallback.");
            try {
              const localRes = await fetch("/data.json");
              const localContentType = localRes.headers.get("content-type") || "";
              if (localContentType.includes("application/json")) {
                const localData = await localRes.json();
                const localAgents = (localData.agents || []).map((a: any) => ({
                  id: a.id,
                  name: a.name,
                }));
                setAgents(localAgents);
                setError("RATE_LIMIT");
                return;
              }
            } catch (fallbackErr) {
              console.error("[Hook] Falha ao carregar fallback /data.json (agents):", fallbackErr);
            }

            throw new Error(message);
          }

          throw new Error(message);
        }
        if (res.status === 304) {
          // Sem conteúdo novo, manter agentes atuais
          return;
        }
        const contentType = res.headers.get("content-type") || "";
        if (!contentType.includes("application/json")) {
          throw new Error("Resposta inválida do servidor ao carregar agentes");
        }
        const data = await res.json();
        setAgents(data);
      } catch (err: any) {
        console.error("[Hook] Erro ao carregar agentes:", err);
        setError(err.message || "Erro ao carregar agentes");
      } finally {
        setIsLoading(false);
      }
    }
    loadAgents();
  }, [groupId]);

  // Helper para construir tickets mock a partir de /data.json
  function buildMockTicketsFromLocal(localData: any): any[] {
    const tickets: any[] = [];
    const byDate = localData.tickets_by_date || {};
    const byStatus = localData.tickets_by_status || {};
    const byPriority = localData.tickets_by_priority || {};
    const agentsLocal = localData.agents || [];
    const groupIdLocal = localData.filters?.group_id ?? 37000000000;

    const statusLabels = Object.keys(byStatus);
    const priorityLabels = Object.keys(byPriority);
    const agentIds = agentsLocal.map((a: any) => a.id);

    const statusCycle = statusLabels.length ? statusLabels : ["Resolvido"];
    const priorityCycle = priorityLabels.length ? priorityLabels : ["Média"];

    const priorityMap: Record<string, number> = { Baixa: 1, Média: 2, Alta: 3, Urgente: 4 };

    Object.entries(byDate as Record<string, number>).forEach(([date, count]) => {
      for (let i = 0; i < count; i += 1) {
        const statusLabel = statusCycle[i % statusCycle.length];
        const priorityLabel = priorityCycle[i % priorityCycle.length];

        const statusNum =
          statusLabel === "Resolvido" || statusLabel === "Fechado"
            ? 6 // resolved
            : 2; // pending/aberto
        const priorityNum = priorityMap[priorityLabel] ?? 2;
        const agentIdLocal = agentIds.length ? agentIds[i % agentIds.length] : null;

        tickets.push({
          id: tickets.length + 1,
          created_at: `${date}T12:00:00Z`,
          status: statusNum,
          priority: priorityNum,
          group_id: groupIdLocal,
          responder_id: agentIdLocal,
          custom_fields: {
            cf_csat_rating: localData.summary?.csat_general ?? null,
          },
        });
      }
    });

    return tickets;
  }

  // Buscar tickets quando qualquer filtro mudar
  useEffect(() => {
    if (!startDate || !endDate) return;

    async function loadTickets() {
      try {
        setIsLoading(true);
        setError(null);

        const params = new URLSearchParams({
          startDate,
          endDate,
          queueId: "8424450",
          queueName: "Servidores Clouds e Dedicados - 77",
        });

        if (groupId && groupId !== "Todos") {
          params.append("groupId", groupId);
        }

        if (agentId && agentId !== "Todos") {
          params.append("agentId", agentId);
        }

        const res = await fetch(apiUrl(`/api/tickets?${params.toString()}`), { cache: "no-store" });
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({ error: "Erro desconhecido ao carregar tickets" }));
          const message = errBody.error || "Erro ao carregar tickets";

          // Não usar mais /data.json como fallback para tickets.
          // Se houver 429 (rate limit), deixar o erro aparecer na UI
          // para não exibir números de mock que não respeitam os filtros.
          throw new Error(message);
        }
        if (res.status === 304) {
          // Sem conteúdo novo, manter tickets atuais
          return;
        }
        const contentType = res.headers.get("content-type") || "";
        if (!contentType.includes("application/json")) {
          const textPreview = (await res.text().catch(() => "")).slice(0, 200);
          console.error("[Hook] /api/tickets content-type inesperado:", contentType, "preview:", textPreview);
          throw new Error("Resposta inválida do servidor ao carregar tickets");
        }
        const data = await res.json();
        setTickets(data);
      } catch (err: any) {
        console.error("[Hook] Erro ao carregar tickets:", err);
        // Em caso de erro (incluindo 429), manter os últimos tickets válidos
        // e apenas sinalizar o erro na UI.
        setError(err.message || "Erro ao carregar tickets");
      } finally {
        setIsLoading(false);
      }
    }
    loadTickets();
  }, [startDate, endDate, groupId, agentId]);

  // Buscar chamadas do Zenvia quando datas mudarem (apenas se tiver credenciais)
  useEffect(() => {
    if (!startDate || !endDate || !credentials) return;

    async function loadCalls() {
      try {
        setError(null);
        const token = credentials?.zenviaApiToken;
        if (!token) {
          setCalls([]);
          return;
        }

        const params = new URLSearchParams({
          startDate,
          endDate,
          queueId: "8424450",
          queueName: "Servidores Clouds e Dedicados - 77",
        });

        const res = await fetch(apiUrl(`/api/calls?${params.toString()}`), {
          headers: {
            "x-zenvia-api-token": token,
          },
        });
        if (!res.ok) {
          const err = await res.json();
          // Não falhar completamente se houver erro nas chamadas, apenas logar
          console.warn("[Hook] Erro ao carregar chamadas:", err);
          setCalls([]);
          return;
        }
        const data = await res.json();
        setCalls(data);
      } catch (err: any) {
        console.warn("[Hook] Erro ao carregar chamadas:", err);
        setCalls([]);
      }
    }
    loadCalls();
  }, [startDate, endDate, credentials]);

  return {
    isLoading,
    error,
    groups,
    agents,
    tickets,
    calls,
  };
}