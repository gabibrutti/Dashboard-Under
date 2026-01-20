const express = require("express");
const router = express.Router();
const { getGroups, getAgents, getTickets } = require("../services/freshservice");
const { fetchCalls } = require("../services/zenvia");
const { calcAllMetrics } = require("../services/metricsService");
const { calcAllHdiMetrics } = require("../services/hdiMetricsService");
const { generateMaturityReport, CATEGORIES } = require("../services/maturityService");
const { calcAllHdiSccMetrics } = require("../services/hdiSccService");

// Cache simples em memória para métricas HDI
// Chave: JSON.stringify({ startDate, endDate, groupId, agentId })
// Valor: { data, timestamp }
const hdiMetricsCache = new Map();

// Cache simples em memória para tickets brutos
// Chave: JSON.stringify({ startDate, endDate, groupId, agentId })
// Valor: { data, timestamp }
const ticketsCache = new Map();

// Middleware para receber credenciais do frontend
router.use(express.json());

router.post("/config", async (req, res) => {
  try {
    const { freshserviceApiKey, freshserviceDomain, zenviaApiToken } = req.body;
    
    if (!freshserviceApiKey || !zenviaApiToken) {
      return res.status(400).json({ error: "Credenciais incompletas" });
    }

    // Armazenar temporariamente nas variáveis de ambiente da requisição
    // (em produção, usar um sistema de gerenciamento de sessão mais robusto)
    req.freshserviceApiKey = freshserviceApiKey;
    req.freshserviceDomain = freshserviceDomain || "https://under.freshservice.com";
    req.zenviaApiToken = zenviaApiToken;

    res.json({ success: true, message: "Credenciais configuradas" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Erro ao configurar credenciais" });
  }
});

router.get("/groups", async (req, res) => {
  try {
    const { getGroups: getGroupsWithCreds } = require("../services/freshservice");
    const groups = await getGroupsWithCreds();
    res.json(groups);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Erro ao carregar grupos" });
  }
});

router.get("/agents", async (req, res) => {
  try {
    const { groupId } = req.query;
    const { getAgents: getAgentsWithCreds } = require("../services/freshservice");
    const agents = await getAgentsWithCreds(groupId);
    res.json(agents);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Erro ao carregar agentes" });
  }
});

router.get("/tickets", async (req, res) => {
  const { startDate, endDate, groupId, agentId } = req.query;
  const cacheKey = JSON.stringify({ startDate, endDate, groupId, agentId });
  const now = Date.now();
  const TTL_MS = 2 * 60 * 1000; // 2 minutos

  // Se existe cache recente, retorna direto
  const cached = ticketsCache.get(cacheKey);
  if (cached && now - cached.timestamp < TTL_MS) {
    return res.json(cached.data);
  }

  try {
    const { getTickets: getTicketsWithCreds } = require("../services/freshservice");
    const tickets = await getTicketsWithCreds({ startDate, endDate, groupId, agentId });

    ticketsCache.set(cacheKey, {
      data: tickets,
      timestamp: now,
    });

    res.json(tickets);
  } catch (err) {
    console.error(err);

    const message = err.message || "Erro ao carregar tickets";

    // Se for rate limit (420/429), tentar estratégias de fallback amigáveis
    const isRateLimit = message.includes("429") || message.includes("420");
    if (isRateLimit) {
      const cachedOnError = ticketsCache.get(cacheKey);
      if (cachedOnError) {
        console.warn("[Tickets] Freshservice rate limit. Devolvendo dados em cache para", cacheKey);
        return res.json(cachedOnError.data);
      }

      // Fallback opcional: dataset fixo de novembro/2025 para grupo Suporte
      // startDate: 2025-11-01, endDate: 2025-11-30, groupId: 37000043862 (Suporte)
      const isNov2025Range =
        startDate === "2025-11-01" && endDate === "2025-11-30";
      const isSuporteGroup = String(groupId) === "37000043862";

      if (isNov2025Range && isSuporteGroup) {
        try {
          // O arquivo deve ser criado manualmente a partir de um export real do Freshservice
          // Estrutura esperada: array de tickets no mesmo formato da API /tickets?include=stats
          // Caminho: server/data/freshservice_nov_2025_suporte.json
          // eslint-disable-next-line global-require, import/no-dynamic-require
          const fixedTickets = require("../data/freshservice_nov_2025_suporte.json");

          console.warn(
            "[Tickets] Freshservice rate limit em novembro/2025 (Suporte). Devolvendo dataset fixo de servidor.",
          );

          // Opcionalmente salvar no cache para reutilizar em próximas chamadas
          ticketsCache.set(cacheKey, {
            data: fixedTickets,
            timestamp: now,
          });

          return res.json(fixedTickets);
        } catch (fallbackErr) {
          console.error(
            "[Tickets] Falha ao carregar dataset fixo de novembro/2025 (Suporte):",
            fallbackErr,
          );
        }
      }

      // Sem cache e sem dataset fixo: retornar erro amigável
      return res.status(503).json({
        error:
          "Freshservice limitou requisições, exibindo últimos dados disponíveis (atualização em até 2 min)",
      });
    }

    res.status(500).json({ error: message });
  }
});

router.get("/hdi-metrics", async (req, res) => {
  try {
    const { startDate, endDate, groupId, agentId } = req.query;
    const cacheKey = JSON.stringify({ startDate, endDate, groupId, agentId });
    const cached = hdiMetricsCache.get(cacheKey);
    const now = Date.now();
    const TTL_MS = 60 * 1000; // 1 minuto

    if (cached && now - cached.timestamp < TTL_MS) {
      return res.json({ ...cached.data, cached: true });
    }

    const { getTickets: getTicketsWithCreds, getAgents } = require("../services/freshservice");
    
    // Buscar TODOS os tickets (sem filtro de grupo) para depois filtrar pelo grupo do analista
    const allTickets = await getTicketsWithCreds({ startDate, endDate });
    
    // Buscar todos os agentes para mapear grupo
    const allAgents = await getAgents(null);
    const agentGroupMap = new Map();
    allAgents.forEach(agent => {
      agentGroupMap.set(agent.id, {
        primary_group_id: agent.primary_group_id,
        group_ids: agent.group_ids || [],
      });
    });
    
    // Filtrar tickets pelo período selecionado (created_at dentro do range)
    const start = startDate ? new Date(startDate + "T00:00:00") : null;
    const end = endDate ? new Date(endDate + "T23:59:59") : null;
    const gid = groupId && groupId !== "Todos" ? Number(groupId) : null;
    
    const tickets = allTickets.filter(ticket => {
      if (!ticket.created_at) return false;
      const created = new Date(ticket.created_at);
      if (start && created < start) return false;
      if (end && created > end) return false;
      
      // Filtrar pelo grupo do ANALISTA que resolveu (responder_id)
      if (gid && ticket.responder_id) {
        const agentInfo = agentGroupMap.get(ticket.responder_id);
        if (agentInfo) {
          const belongsToGroup = agentInfo.primary_group_id === gid || 
            (Array.isArray(agentInfo.group_ids) && agentInfo.group_ids.includes(gid));
          if (!belongsToGroup) return false;
        } else {
          // Analista não encontrado, usar group_id do ticket como fallback
          if (ticket.group_id !== gid) return false;
        }
      } else if (gid && !ticket.responder_id) {
        // Ticket sem analista atribuído, usar group_id do ticket
        if (ticket.group_id !== gid) return false;
      }
      
      return true;
    });
    
    console.log(`[/hdi-metrics] Total bruto: ${allTickets.length}, Filtrado por período/grupo: ${tickets.length}`);
    
    // Debug: contar tickets por status
    const statusCount = {};
    tickets.forEach(t => {
      statusCount[t.status] = (statusCount[t.status] || 0) + 1;
    });
    console.log(`[/hdi-metrics] Tickets por status:`, statusCount);
    
    // Debug: contar tickets com resolved_at
    const withResolved = tickets.filter(t => t.resolved_at || t.stats?.resolved_at).length;
    const withClosed = tickets.filter(t => t.closed_at || t.stats?.closed_at).length;
    const withDueBy = tickets.filter(t => t.due_by).length;
    console.log(`[/hdi-metrics] Com resolved_at: ${withResolved}, Com closed_at: ${withClosed}, Com due_by: ${withDueBy}`);
    
    // Debug: mostrar exemplo de ticket resolvido
    const resolvedExample = tickets.find(t => t.stats?.resolved_at);
    if (resolvedExample) {
      console.log(`[/hdi-metrics] Exemplo ticket resolvido:`, {
        id: resolvedExample.id,
        status: resolvedExample.status,
        created_at: resolvedExample.created_at,
        resolved_at: resolvedExample.stats?.resolved_at,
        due_by: resolvedExample.due_by,
        group_id: resolvedExample.group_id,
      });
    }
    
    // Debug: mostrar exemplo de ticket com due_by
    const dueByExample = tickets.find(t => t.due_by);
    if (dueByExample) {
      console.log(`[/hdi-metrics] Exemplo ticket com due_by:`, {
        id: dueByExample.id,
        status: dueByExample.status,
        due_by: dueByExample.due_by,
        resolved_at: dueByExample.stats?.resolved_at || dueByExample.resolved_at,
      });
    } else {
      // Mostrar estrutura de um ticket para debug
      const sampleTicket = tickets[0];
      if (sampleTicket) {
        console.log(`[/hdi-metrics] NENHUM ticket com due_by! Estrutura do ticket:`, Object.keys(sampleTicket));
        console.log(`[/hdi-metrics] Campos de SLA do ticket:`, {
          due_by: sampleTicket.due_by,
          fr_due_by: sampleTicket.fr_due_by,
          sla_policy_id: sampleTicket.sla_policy_id,
          priority: sampleTicket.priority,
        });
      }
    }

    // Cálculo das métricas HDI básicas diretamente aqui para evitar dependência de módulo ES
    const totalTickets = tickets.length;

    const backlogTickets = tickets.filter(ticket => {
      const resolvedAt = ticket.resolved_at || ticket.stats?.resolved_at || ticket.closed_at || ticket.stats?.closed_at;
      return !resolvedAt;
    }).length;

    const reopenedCount = tickets.reduce(
      (acc, ticket) => acc + (ticket.reopened_count && ticket.reopened_count > 0 ? ticket.reopened_count : 0),
      0,
    );

    const reopenedRate = totalTickets > 0 ? (reopenedCount / totalTickets) * 100 : 0;

    // FCR: tickets resolvidos na primeira interação
    // Critério: resolvidos em até 4 horas OU com apenas 1 resposta do agente
    const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;
    let fcrCount = 0;
    let fcrTotalEligible = 0;

    tickets.forEach(ticket => {
      const resolvedAtStr = ticket.resolved_at || ticket.stats?.resolved_at || ticket.closed_at || ticket.stats?.closed_at;
      if (!resolvedAtStr) return;

      const createdAt = new Date(ticket.created_at).getTime();
      const resolvedAt = new Date(resolvedAtStr).getTime();
      const withinTime = resolvedAt - createdAt <= FOUR_HOURS_MS;

      const stats = ticket.stats || {};
      // Considerar FCR se: resolvido rápido OU apenas 1 resposta do agente OU sem escalonamento de grupo
      const outboundCount = stats.outbound_count || 0;
      const groupEscalated = stats.group_escalated || false;
      
      const isFcr = withinTime || (outboundCount <= 1 && !groupEscalated);

      // Considerar apenas tickets resolvidos para o denominador de FCR
      fcrTotalEligible += 1;
      if (isFcr) fcrCount += 1;
    });

    const fcrRate = fcrTotalEligible > 0 ? (fcrCount / fcrTotalEligible) * 100 : 0;
    console.log(`[/hdi-metrics] FCR: ${fcrCount}/${fcrTotalEligible} = ${fcrRate.toFixed(1)}%`);

    // FLR: tickets resolvidos pelo grupo N1 sem transferência de grupo.
    // Para simplificar, considerar que group_id nunca mudou (sem histórico avançado):
    // se resolved_at/closed_at existe e ticket.stats?.escalated_to é falso.
    let flrCount = 0;
    let flrTotalEligible = 0;

    tickets.forEach(ticket => {
      const resolvedAtStr = ticket.resolved_at || ticket.stats?.resolved_at || ticket.closed_at || ticket.stats?.closed_at;
      if (!resolvedAtStr) return;

      flrTotalEligible += 1;

      const stats = ticket.stats || {};
      const escalated = Boolean(stats.escalated_to || stats.escalated);
      if (!escalated) {
        flrCount += 1;
      }
    });

    const flrRate = flrTotalEligible > 0 ? (flrCount / flrTotalEligible) * 100 : 0;
    console.log(`[/hdi-metrics] FLR: ${flrCount}/${flrTotalEligible} = ${flrRate.toFixed(1)}%`);

    // CSAT: média e % positivas
    let csatSum = 0;
    let csatCount = 0;
    let csatPositive = 0;

    tickets.forEach(ticket => {
      const rating = ticket.satisfaction_rating?.rating ?? ticket.custom_fields?.cf_csat_rating;
      if (typeof rating === "number") {
        csatSum += rating;
        csatCount += 1;
        if (rating >= 4) csatPositive += 1; // assumir escala 1-5
      }
    });

    const csatAvg = csatCount > 0 ? csatSum / csatCount : 0;
    const csatPositiveRate = csatCount > 0 ? (csatPositive / csatCount) * 100 : 0;

    // Distribuição por prioridade
    const priorityLabels = {
      1: "Baixa",
      2: "Média",
      3: "Alta",
      4: "Urgente",
    };

    const priorityDist = [
      "Baixa",
      "Média",
      "Alta",
      "Urgente",
    ].map(label => ({ name: label, value: 0 }));

    tickets.forEach(ticket => {
      const pLabel = priorityLabels[ticket.priority] || "Média";
      const entry = priorityDist.find(p => p.name === pLabel);
      if (entry) entry.value += 1;
    });

    // SLA dentro do prazo x violado
    // Configuração de SLA por prioridade (em minutos)
    const slaByPriority = {
      1: 72 * 60,   // Baixa: 72h
      2: 24 * 60,   // Média: 24h
      3: 4 * 60,    // Alta: 4h
      4: 2 * 60,    // Urgente: 2h
    };
    
    let slaMet = 0;
    let slaViolated = 0;
    let slaNoData = 0;

    tickets.forEach(ticket => {
      // Verificar se foi resolvido
      const resolvedAtStr = ticket.resolved_at || ticket.stats?.resolved_at || ticket.closed_at || ticket.stats?.closed_at;
      if (!resolvedAtStr) {
        // Ticket ainda aberto - não conta para SLA de resolução
        return;
      }
      
      // Tentar usar due_by do ticket
      let dueBy = ticket.due_by;
      
      // Se não tem due_by, calcular baseado na prioridade
      if (!dueBy) {
        const priority = ticket.priority || 2; // Default: Média
        const slaMinutes = slaByPriority[priority] || slaByPriority[2];
        const createdAt = new Date(ticket.created_at).getTime();
        dueBy = new Date(createdAt + slaMinutes * 60 * 1000).toISOString();
      }
      
      const due = new Date(dueBy).getTime();
      const resolved = new Date(resolvedAtStr).getTime();
      
      if (resolved <= due) {
        slaMet += 1;
      } else {
        slaViolated += 1;
      }
    });

    console.log(`[/hdi-metrics] SLA: Met=${slaMet}, Violated=${slaViolated}, Total=${slaMet + slaViolated}`);

    const slaDonut = {
      within: slaMet,
      breached: slaViolated,
    };

    // Top 5 grupos de escalonamento (mudança de grupo no histórico)
    // Se o Freshservice não expõe histórico direto via /tickets?include=stats,
    // usaremos estatística baseada em campo stats.escalated_to_group_id (quando existir).
    const escalationMap = new Map();

    tickets.forEach(ticket => {
      const stats = ticket.stats || {};
      const escalatedGroupId = stats.escalated_to_group_id;
      if (!escalatedGroupId) return;
      const key = String(escalatedGroupId);
      escalationMap.set(key, (escalationMap.get(key) || 0) + 1);
    });

    const topEscalationGroups = Array.from(escalationMap.entries())
      .map(([groupIdStr, count]) => ({ groupId: groupIdStr, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // ========== MÉTRICAS HDI AVANÇADAS ==========
    // Usar o serviço hdiMetricsService para cálculos completos
    const hdiMetrics = calcAllHdiMetrics(tickets, [], { startDate, endDate });

    // Calcular Backlog detalhado com distribuição por idade
    const backlogDetailed = hdiMetrics.backlog;

    // ========== PONTUAÇÃO DE MATURIDADE HDI ==========
    // Auto-avaliação baseada nas métricas operacionais
    const maturityReport = generateMaturityReport({}, {
      fcr: { rate: fcrRate },
      flr: { rate: flrRate },
      abandonmentRate: { rate: 0 }, // Sem dados de chamadas nesta rota
      backlog: backlogDetailed,
      csat: { average: csatAvg, positiveRate: csatPositiveRate }
    });

    // Custo por ticket (placeholder - deve ser configurado pelo usuário)
    const costPerTicket = hdiMetrics.costPerTicket;

    const responsePayload = {
      totalTickets,
      backlog: backlogTickets,
      reopenedCount,
      reopenedRate,
      fcr: {
        rate: fcrRate,
        totalEligible: fcrTotalEligible,
        count: fcrCount,
      },
      flr: {
        rate: flrRate,
        totalEligible: flrTotalEligible,
        count: flrCount,
      },
      csat: {
        average: csatAvg,
        positiveRate: csatPositiveRate,
        total: csatCount,
      },
      priorityDistribution: priorityDist,
      slaDonut,
      topEscalationGroups,
      
      // ========== NOVAS MÉTRICAS HDI ==========
      hdiAdvanced: {
        // Backlog detalhado com distribuição por idade
        backlogDetailed: {
          openTickets: backlogDetailed.openTickets,
          closedTickets: backlogDetailed.closedTickets,
          netBacklog: backlogDetailed.netBacklog,
          avgAgeHours: backlogDetailed.avgAgeHours,
          ageDistribution: backlogDetailed.ageDistribution
        },
        // Custo por ticket
        costPerTicket: costPerTicket.costPerTicket,
        // Métricas de eficiência
        efficiency: {
          fcrRate: Math.round(fcrRate * 100) / 100,
          flrRate: Math.round(flrRate * 100) / 100,
          slaComplianceRate: (slaMet + slaViolated) > 0 ? Math.round((slaMet / (slaMet + slaViolated)) * 100 * 100) / 100 : 0
        }
      },
      
      // ========== PONTUAÇÃO DE MATURIDADE ==========
      maturity: {
        finalScore: maturityReport.finalScore,
        passed: maturityReport.passed,
        passingScore: maturityReport.passingScore,
        status: maturityReport.status,
        statusMessage: maturityReport.statusMessage,
        categories: maturityReport.categories,
        recommendations: maturityReport.recommendations.slice(0, 5), // Top 5 recomendações
        summary: maturityReport.summary
      }
    };

    console.log(`[/hdi-metrics] Resposta: totalTickets=${totalTickets}, backlog=${backlogTickets}, FCR=${fcrRate.toFixed(1)}%, FLR=${flrRate.toFixed(1)}%`);

    hdiMetricsCache.set(cacheKey, {
      data: responsePayload,
      timestamp: now,
    });

    res.json(responsePayload);
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ error: err.message || "Erro ao calcular métricas HDI" });
  }
});

router.get("/calls", async (req, res) => {
  try {
    const { startDate, endDate, queueId, queueName } = req.query;
    const apiToken = req.headers["x-zenvia-api-token"] || process.env.ZENVIA_API_TOKEN;
    
    if (!apiToken) {
      return res.status(401).json({ error: "Credenciais do Zenvia não configuradas" });
    }

    if (!startDate || !endDate) {
      return res.status(400).json({ error: "startDate e endDate são obrigatórios" });
    }

    // Se vier queueId, usar como uraId específico; caso contrário, usar padrão 44165
    const uraId = queueId || "44165";
    console.log(`[/calls] start=${startDate} end=${endDate} queueId=${queueId || "-"} queueName=${queueName || "-"} uraId=${uraId}`);
    
    const calls = await fetchCalls({ startDate, endDate, apiToken, uraId, queueId, queueName });
    console.log(`[/calls] total recebidas da Zenvia: ${calls.length}`);

    // Filtro por fila específica: quando queueId=8424450, usar chamadas do endpoint 'fila'
    const normalizedQueueId = queueId ? String(queueId).trim() : null;
    const normalizedQueueName = queueName ? String(queueName).toLowerCase().trim() : null;
    let filtered = calls;
    if (normalizedQueueId === "8424450") {
      console.log("[/calls] Aplicando filtro para fila 8424450 (chamadas do endpoint 'fila')");
      console.log("[/calls] Exemplos de _source e destinationNumber:", calls.slice(0, 5).map(c => ({ id: c.id, _source: c._source, destinationNumber: c.destinationNumber, direction: c.direction })));
      filtered = calls.filter(call => call._source === 'fila' && call.direction === 'inbound');
    } else if (normalizedQueueId || normalizedQueueName) {
      // fallback genérico para outras filas (se houver)
      filtered = calls.filter(call => {
        const callQueueId = call.queueId ? String(call.queueId).trim() : "";
        const callQueueName = call.queueName ? String(call.queueName).toLowerCase().trim() : "";
        const idMatch = normalizedQueueId ? callQueueId === normalizedQueueId : false;
        const nameMatch = normalizedQueueName ? callQueueName === normalizedQueueName : false;
        return idMatch || nameMatch;
      });
    }
    // Se não houver queueId ou queueName, retorna todas as chamadas (sem filtro)

    console.log(`[/calls] total após filtro fila: ${filtered.length}`);

    res.json(filtered);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Erro ao carregar chamadas" });
  }
});

// ============================================================================
// ROTA /metrics - Retorna as 8 métricas modulares em paralelo
// ============================================================================

const metricsCache = new Map();

router.get("/metrics", async (req, res) => {
  const { startDate, endDate, groupId, agentId } = req.query;

  if (!startDate || !endDate) {
    return res.status(400).json({ error: "startDate e endDate são obrigatórios" });
  }

  const cacheKey = JSON.stringify({ startDate, endDate, groupId, agentId });
  const now = Date.now();
  const TTL_MS = 2 * 60 * 1000; // 2 minutos

  // Verificar cache
  const cached = metricsCache.get(cacheKey);
  if (cached && now - cached.timestamp < TTL_MS) {
    console.log("[/metrics] Retornando do cache");
    return res.json({ ...cached.data, cached: true });
  }

  try {
    // Buscar tickets do Freshservice (usa cache interno também)
    console.log("[/metrics] Buscando tickets para métricas...");
    const tickets = await getTickets({ startDate, endDate, groupId, agentId });
    console.log(`[/metrics] ${tickets.length} tickets carregados`);

    // DEBUG: Mostrar estrutura COMPLETA de um ticket para entender os campos
    if (tickets.length > 0) {
      const sample = tickets[0];
      console.log("[/metrics] Exemplo de ticket COMPLETO:", JSON.stringify(sample, null, 2));

      // Contar tickets por status
      const statusCount = {};
      tickets.forEach(t => {
        statusCount[t.status] = (statusCount[t.status] || 0) + 1;
      });
      console.log("[/metrics] Tickets por status:", statusCount);

      // Contar tickets com resolved_at ou stats.resolved_at
      const withResolvedAt = tickets.filter(t => t.resolved_at || t.stats?.resolved_at).length;
      const withClosedAt = tickets.filter(t => t.closed_at || t.stats?.closed_at).length;
      console.log(`[/metrics] Com resolved_at: ${withResolvedAt}, Com closed_at: ${withClosedAt}`);
    }

    // Buscar nome do grupo se groupId foi fornecido
    let groupName = null;
    if (groupId && groupId !== "Todos") {
      try {
        const groups = await getGroups();
        const group = groups.find(g => String(g.id) === String(groupId));
        groupName = group?.name || null;
      } catch (e) {
        console.warn("[/metrics] Não foi possível obter nome do grupo:", e.message);
      }
    }

    // Calcular todas as 8 métricas (passando groupId e groupName para cálculos de tempo e SLA)
    const metrics = calcAllMetrics(tickets, startDate, endDate, groupId, groupName);

    // Verificar se alguma métrica teve erro
    const errors = Object.values(metrics)
      .filter((m) => m && m.error)
      .map((m) => m.error);

    // Formatar resposta
    const response = {
      ticketsRecebidos: metrics.ticketsRecebidos.value,
      ticketsResolvidos: metrics.ticketsResolvidos.value,
      ticketsNaoResolvidos: metrics.ticketsNaoResolvidos.value,
      slaResolucao: Math.round(metrics.slaResolucao.value * 10) / 10,
      tempoMedioResolucao: Math.round(metrics.tempoMedioResolucao.value),
      tempoMedioPrimeiraResposta: Math.round(metrics.tempoMedioPrimeiraResposta.value),
      taxaReabertura: Math.round(metrics.taxaReabertura.value * 10) / 10,
      csatMedio: Math.round(metrics.csatMedio.value * 10) / 10,
      csatCount: metrics.csatMedio.count || 0,
      totalTickets: tickets.length,
      groupName: groupName,
      slaConfig: metrics.slaConfig, // Incluir configuração de SLA na resposta
      errors: errors.length > 0 ? errors : null,
      cached: false,
    };

    // Salvar no cache
    metricsCache.set(cacheKey, {
      data: response,
      timestamp: now,
    });

    res.json(response);
  } catch (err) {
    console.error("[/metrics] Erro:", err);

    // Tentar retornar cache expirado se existir
    if (cached) {
      console.warn("[/metrics] Retornando cache expirado devido a erro");
      return res.json({ ...cached.data, cached: true, stale: true });
    }

    res.status(500).json({ error: err.message || "Erro ao calcular métricas" });
  }
});

// ============================================================================
// ROTA /analyst-metrics - Retorna métricas por analista
// ============================================================================

const analystMetricsCache = new Map();

router.get("/analyst-metrics", async (req, res) => {
  const { startDate, endDate, groupId } = req.query;

  if (!startDate || !endDate) {
    return res.status(400).json({ error: "startDate e endDate são obrigatórios" });
  }

  const cacheKey = JSON.stringify({ startDate, endDate, groupId, type: "analyst" });
  const now = Date.now();
  const TTL_MS = 2 * 60 * 1000; // 2 minutos

  // Verificar cache
  const cached = analystMetricsCache.get(cacheKey);
  if (cached && now - cached.timestamp < TTL_MS) {
    console.log("[/analyst-metrics] Retornando do cache");
    return res.json({ ...cached.data, cached: true });
  }

  try {
    // Buscar TODOS os agentes (sem filtro de grupo) para ter o mapa de nomes completo
    const allAgents = await getAgents(null);
    console.log(`[/analyst-metrics] ${allAgents.length} agentes totais carregados`);

    // Criar mapa de agentes por ID (para obter nomes)
    const agentMap = new Map();
    allAgents.forEach(agent => {
      agentMap.set(agent.id, {
        name: agent.name,
        primary_group_id: agent.primary_group_id,
        group_ids: agent.group_ids || [],
      });
    });

    // Buscar agentes do grupo específico (se filtrado)
    let groupAgentIds = null;
    if (groupId && groupId !== "Todos") {
      const gid = Number(groupId);
      groupAgentIds = new Set();
      allAgents.forEach(agent => {
        if (agent.primary_group_id === gid) {
          groupAgentIds.add(agent.id);
        } else if (Array.isArray(agent.group_ids) && agent.group_ids.includes(gid)) {
          groupAgentIds.add(agent.id);
        }
      });
      console.log(`[/analyst-metrics] ${groupAgentIds.size} agentes no grupo ${groupId}`);
    }

    // Buscar tickets do período (sem filtro de grupo para pegar todos)
    const allTickets = await getTickets({ startDate, endDate });
    
    // Filtrar tickets pelo período e pelo grupo (se selecionado)
    const start = startDate ? new Date(startDate + "T00:00:00") : null;
    const end = endDate ? new Date(endDate + "T23:59:59") : null;
    
    const tickets = allTickets.filter(ticket => {
      if (!ticket.created_at) return false;
      const created = new Date(ticket.created_at);
      if (start && created < start) return false;
      if (end && created > end) return false;
      
      // Se tem filtro de grupo, verificar se o ticket pertence ao grupo
      if (groupId && groupId !== "Todos") {
        const gid = Number(groupId);
        if (ticket.group_id !== gid) return false;
      }
      
      return true;
    });
    
    console.log(`[/analyst-metrics] ${tickets.length} tickets no período`);

    // Calcular métricas por analista
    const analystStats = new Map();

    tickets.forEach(ticket => {
      const agentId = ticket.responder_id;
      if (!agentId) return; // Ignorar tickets sem analista atribuído

      // Se tem filtro de grupo, verificar se o analista pertence ao grupo
      if (groupAgentIds && !groupAgentIds.has(agentId)) {
        // Analista não pertence ao grupo, mas pode ter atendido ticket do grupo
        // Vamos incluir mesmo assim para mostrar quem atendeu
      }

      const agentInfo = agentMap.get(agentId);
      const agentName = agentInfo?.name || `Agente ${agentId}`;
      
      if (!analystStats.has(agentId)) {
        analystStats.set(agentId, {
          id: agentId,
          name: agentName,
          total: 0,
          resolved: 0,
          slaMet: 0,
          reopened: 0,
          resolutionMinutes: 0,
          firstResponseMinutes: 0,
          ticketsWithResolution: 0,
          ticketsWithFirstResponse: 0,
        });
      }

      const stats = analystStats.get(agentId);
      stats.total += 1;

      // Verificar se resolvido (status 4 = Resolved, 5 = Closed no Freshservice)
      const isResolved = ticket.status === 4 || ticket.status === 5 || ticket.status === "Resolved" || ticket.status === "Closed";
      const resolvedAt = ticket.resolved_at || ticket.stats?.resolved_at || ticket.closed_at || ticket.stats?.closed_at;
      
      if (isResolved || resolvedAt) {
        stats.resolved += 1;

        // Calcular tempo de resolução (se tiver data de resolução)
        if (resolvedAt) {
          const createdAt = new Date(ticket.created_at).getTime();
          const resolvedTime = new Date(resolvedAt).getTime();
          const resolutionMinutes = (resolvedTime - createdAt) / (1000 * 60);
          if (resolutionMinutes > 0) {
            stats.resolutionMinutes += resolutionMinutes;
            stats.ticketsWithResolution += 1;
          }

          // Verificar SLA
          if (ticket.due_by) {
            const dueBy = new Date(ticket.due_by).getTime();
            if (resolvedTime <= dueBy) {
              stats.slaMet += 1;
            }
          }
        }
      }

      // Verificar primeira resposta
      const firstResponded = ticket.stats?.first_responded_at;
      if (firstResponded) {
        const createdAt = new Date(ticket.created_at).getTime();
        const respondedTime = new Date(firstResponded).getTime();
        const responseMinutes = (respondedTime - createdAt) / (1000 * 60);
        if (responseMinutes > 0) {
          stats.firstResponseMinutes += responseMinutes;
          stats.ticketsWithFirstResponse += 1;
        }
      }

      // Verificar reabertura
      if (ticket.reopened_count && ticket.reopened_count > 0) {
        stats.reopened += 1;
      }
    });

    // Converter para array e calcular médias
    const analysts = Array.from(analystStats.values())
      .map(stats => ({
        id: stats.id,
        name: stats.name,
        total: stats.total,
        resolved: stats.resolved,
        slaPercent: stats.resolved > 0 ? Math.round((stats.slaMet / stats.resolved) * 100) : 0,
        reopened: stats.reopened,
        avgResolutionMinutes: stats.ticketsWithResolution > 0 
          ? Math.round(stats.resolutionMinutes / stats.ticketsWithResolution) 
          : 0,
        avgFirstResponseMinutes: stats.ticketsWithFirstResponse > 0 
          ? Math.round(stats.firstResponseMinutes / stats.ticketsWithFirstResponse) 
          : 0,
      }))
      .sort((a, b) => b.resolved - a.resolved); // Ordenar por resolvidos

    const response = {
      analysts,
      totalAnalysts: analysts.length,
      totalTickets: tickets.length,
      cached: false,
    };

    // Salvar no cache
    analystMetricsCache.set(cacheKey, {
      data: response,
      timestamp: now,
    });

    res.json(response);
  } catch (err) {
    console.error("[/analyst-metrics] Erro:", err);

    // Tentar retornar cache expirado se existir
    if (cached) {
      console.warn("[/analyst-metrics] Retornando cache expirado devido a erro");
      return res.json({ ...cached.data, cached: true, stale: true });
    }

    res.status(500).json({ error: err.message || "Erro ao calcular métricas por analista" });
  }
});

// ============================================================================
// ROTA /hdi-scc-metrics - Retorna todas as métricas HDI-SCC completas
// ============================================================================

const hdiSccMetricsCache = new Map();

router.get("/hdi-scc-metrics", async (req, res) => {
  const { startDate, endDate, groupId, agentId } = req.query;

  if (!startDate || !endDate) {
    return res.status(400).json({ error: "startDate e endDate são obrigatórios" });
  }

  const cacheKey = JSON.stringify({ startDate, endDate, groupId, agentId, type: "hdi-scc" });
  const now = Date.now();
  const TTL_MS = 2 * 60 * 1000; // 2 minutos

  // Verificar cache
  const cached = hdiSccMetricsCache.get(cacheKey);
  if (cached && now - cached.timestamp < TTL_MS) {
    console.log("[/hdi-scc-metrics] Retornando do cache");
    return res.json({ ...cached.data, cached: true });
  }

  try {
    console.log("[/hdi-scc-metrics] Buscando dados para métricas HDI-SCC...");

    // Buscar tickets
    const { getTickets: getTicketsWithCreds, getGroups: getGroupsWithCreds } = require("../services/freshservice");
    const allTickets = await getTicketsWithCreds({ startDate, endDate });
    
    // Buscar grupos
    const groups = await getGroupsWithCreds();
    
    // Filtrar tickets pelo período e grupo
    const start = startDate ? new Date(startDate + "T00:00:00") : null;
    const end = endDate ? new Date(endDate + "T23:59:59") : null;
    const gid = groupId && groupId !== "Todos" ? Number(groupId) : null;
    
    const tickets = allTickets.filter(ticket => {
      if (!ticket.created_at) return false;
      const created = new Date(ticket.created_at);
      if (start && created < start) return false;
      if (end && created > end) return false;
      if (gid && ticket.group_id !== gid) return false;
      return true;
    });
    
    console.log(`[/hdi-scc-metrics] ${tickets.length} tickets filtrados de ${allTickets.length} total`);

    // Buscar chamadas (se disponível)
    let calls = [];
    try {
      const apiToken = req.headers["x-zenvia-api-token"] || process.env.ZENVIA_API_TOKEN;
      if (apiToken) {
        const { fetchCalls } = require("../services/zenvia");
        calls = await fetchCalls({ startDate, endDate, apiToken, uraId: "44165" });
      }
    } catch (callErr) {
      console.warn("[/hdi-scc-metrics] Não foi possível buscar chamadas:", callErr.message);
    }

    // Calcular todas as métricas HDI-SCC
    const hdiSccMetrics = calcAllHdiSccMetrics(tickets, calls, groups, { startDate, endDate });

    console.log(`[/hdi-scc-metrics] Métricas calculadas com sucesso`);

    // Salvar no cache
    hdiSccMetricsCache.set(cacheKey, {
      data: hdiSccMetrics,
      timestamp: now,
    });

    res.json({ ...hdiSccMetrics, cached: false });
  } catch (err) {
    console.error("[/hdi-scc-metrics] Erro:", err);

    // Tentar retornar cache expirado se existir
    if (cached) {
      console.warn("[/hdi-scc-metrics] Retornando cache expirado devido a erro");
      return res.json({ ...cached.data, cached: true, stale: true });
    }

    res.status(500).json({ error: err.message || "Erro ao calcular métricas HDI-SCC" });
  }
});

module.exports = router;
