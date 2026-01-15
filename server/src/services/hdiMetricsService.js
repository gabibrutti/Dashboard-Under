/**
 * Serviço de Métricas HDI - Padrão HDI
 * 
 * Implementa todas as fórmulas exigidas pelo HDI:
 * - Eficiência Operacional (FCR, FLR, Taxa de Abandono, Custo Unitário)
 * - Gestão da Força de Trabalho (Erlang-C, Gross Staffing)
 * - Qualidade e Satisfação (Occupancy Rate, Backlog)
 */

// ============================================================================
// A. EFICIÊNCIA OPERACIONAL
// ============================================================================

/**
 * Taxa de Resolução no Primeiro Contato (FCR - First Contact Resolution)
 * 
 * Definição HDI: Percentual de incidentes resolvidos durante o contato inicial
 * (telefone, chat) sem desligar ou retornar.
 * 
 * Fórmula: (Incidentes Resolvidos no 1º Contato / Total de Contatos Recebidos) × 100
 */
function calcFCR(tickets, options = {}) {
  try {
    const { startDate, endDate } = options;
    const start = startDate ? new Date(startDate + "T00:00:00") : null;
    const end = endDate ? new Date(endDate + "T23:59:59") : null;

    const ONE_HOUR_MS = 60 * 60 * 1000;
    let fcrCount = 0;
    let totalEligible = 0;

    tickets.forEach(ticket => {
      if (start || end) {
        const created = new Date(ticket.created_at);
        if (start && created < start) return;
        if (end && created > end) return;
      }

      const resolvedAtStr = ticket.resolved_at || ticket.closed_at || ticket.stats?.resolved_at;
      if (!resolvedAtStr) return;

      totalEligible++;

      if (Object.prototype.hasOwnProperty.call(ticket, "fcr")) {
        if (ticket.fcr) fcrCount++;
        return;
      }

      const createdAt = new Date(ticket.created_at).getTime();
      const resolvedAt = new Date(resolvedAtStr).getTime();
      const resolutionTime = resolvedAt - createdAt;

      const stats = ticket.stats || {};
      const agentInteractions = stats.agent_interactions || stats.agent_responses || 0;
      const customerResponses = stats.customer_responses || stats.requester_responded_count || 0;

      const isFCR = resolutionTime <= ONE_HOUR_MS && 
                    agentInteractions <= 1 && 
                    customerResponses === 0;

      if (isFCR) fcrCount++;
    });

    const rate = totalEligible > 0 ? (fcrCount / totalEligible) * 100 : 0;

    return {
      rate: Math.round(rate * 100) / 100,
      count: fcrCount,
      totalEligible,
      error: null
    };
  } catch (error) {
    console.error("[FCR] Erro:", error.message);
    return { rate: 0, count: 0, totalEligible: 0, error: error.message };
  }
}

/**
 * Taxa de Resolução em Primeiro Nível (FLR - First Level Resolution)
 * 
 * Definição HDI: Percentual resolvido pelo Nível 1 (Service Desk) sem escalar
 * para Nível 2 ou 3.
 * 
 * Fórmula: (Incidentes Resolvidos pelo N1 / Total de Incidentes) × 100
 */
function calcFLR(tickets, options = {}) {
  try {
    const { startDate, endDate, n1GroupIds = [] } = options;
    const start = startDate ? new Date(startDate + "T00:00:00") : null;
    const end = endDate ? new Date(endDate + "T23:59:59") : null;

    let flrCount = 0;
    let totalEligible = 0;

    tickets.forEach(ticket => {
      if (start || end) {
        const created = new Date(ticket.created_at);
        if (start && created < start) return;
        if (end && created > end) return;
      }

      const resolvedAtStr = ticket.resolved_at || ticket.closed_at || ticket.stats?.resolved_at;
      if (!resolvedAtStr) return;

      totalEligible++;

      const stats = ticket.stats || {};
      const wasEscalated = Boolean(
        stats.escalated_to || 
        stats.escalated || 
        stats.escalated_to_group_id ||
        stats.group_escalations > 0
      );

      if (!wasEscalated) {
        if (n1GroupIds.length > 0) {
          if (n1GroupIds.includes(ticket.group_id)) {
            flrCount++;
          }
        } else {
          flrCount++;
        }
      }
    });

    const rate = totalEligible > 0 ? (flrCount / totalEligible) * 100 : 0;

    return {
      rate: Math.round(rate * 100) / 100,
      count: flrCount,
      totalEligible,
      error: null
    };
  } catch (error) {
    console.error("[FLR] Erro:", error.message);
    return { rate: 0, count: 0, totalEligible: 0, error: error.message };
  }
}

/**
 * Taxa de Abandono
 * 
 * Definição HDI: Número de tentativas de contato encerradas pelo usuário
 * antes de ser atendido.
 * 
 * Fórmula: (Chamadas Abandonadas / Total de Chamadas Recebidas) × 100
 */
function calcAbandonmentRate(calls, options = {}) {
  try {
    const { startDate, endDate } = options;
    const start = startDate ? new Date(startDate + "T00:00:00") : null;
    const end = endDate ? new Date(endDate + "T23:59:59") : null;

    let abandoned = 0;
    let total = 0;

    calls.forEach(call => {
      const callDate = call.startedAt || call.data_inicio || call.started_at;
      if (start || end) {
        const callTime = new Date(callDate);
        if (start && callTime < start) return;
        if (end && callTime > end) return;
      }

      if (call.direction !== 'inbound' && call.direcao !== 'entrada') return;

      total++;

      if (call.abandoned || call.abandonada || call.status === 'abandonada' || call.status === 'abandoned') {
        abandoned++;
      }
    });

    const rate = total > 0 ? (abandoned / total) * 100 : 0;

    return {
      rate: Math.round(rate * 100) / 100,
      abandoned,
      total,
      error: null
    };
  } catch (error) {
    console.error("[AbandonmentRate] Erro:", error.message);
    return { rate: 0, abandoned: 0, total: 0, error: error.message };
  }
}

/**
 * Custo Unitário (Custo por Ticket)
 * 
 * Definição HDI: Custo total para gerir o suporte dividido pelo volume de tickets.
 * 
 * Fórmula: Orçamento Total do Centro de Suporte / Total de Tickets
 */
function calcCostPerTicket(totalBudget, totalTickets) {
  try {
    if (typeof totalBudget !== 'number' || totalBudget < 0) {
      return { costPerTicket: 0, totalBudget: 0, totalTickets: 0, error: "Orçamento não informado" };
    }

    const costPerTicket = totalTickets > 0 ? totalBudget / totalTickets : 0;

    return {
      costPerTicket: Math.round(costPerTicket * 100) / 100,
      totalBudget,
      totalTickets,
      error: null
    };
  } catch (error) {
    console.error("[CostPerTicket] Erro:", error.message);
    return { costPerTicket: 0, totalBudget: 0, totalTickets: 0, error: error.message };
  }
}

// ============================================================================
// B. GESTÃO DA FORÇA DE TRABALHO (WORKFORCE)
// ============================================================================

/**
 * Cálculo Erlang-C
 * 
 * Fórmula estatística para calcular o número necessário de atendentes com base em:
 * - Volume de chamadas
 * - Tempo médio de atendimento (TMA)
 * - Nível de serviço desejado (ex: 80% atendidas em 20s)
 * 
 * Recomendação HDI: Utilizar para o cálculo de staff do 1º Nível
 */
function calcErlangC(params) {
  try {
    const {
      callsPerHour,        // Volume de chamadas por hora
      avgHandleTime,       // Tempo médio de atendimento em segundos
      targetServiceLevel,  // Ex: 0.80 (80%)
      targetAnswerTime,    // Ex: 20 segundos
      shrinkage = 0        // Fator de shrinkage (0-1)
    } = params;

    if (!callsPerHour || !avgHandleTime) {
      return { 
        agentsRequired: 0, 
        serviceLevel: 0, 
        error: "Parâmetros insuficientes para Erlang-C" 
      };
    }

    // Intensidade de tráfego (Erlangs)
    const trafficIntensity = (callsPerHour * avgHandleTime) / 3600;
    
    // Número mínimo de agentes (arredondado para cima)
    let agents = Math.ceil(trafficIntensity);
    
    // Função para calcular probabilidade de espera (Erlang-C)
    function erlangCProbability(a, n) {
      if (n <= a) return 1;
      
      // Calcular (a^n / n!) * (n / (n - a))
      let sumPart = 0;
      for (let k = 0; k < n; k++) {
        sumPart += Math.pow(a, k) / factorial(k);
      }
      
      const lastTerm = (Math.pow(a, n) / factorial(n)) * (n / (n - a));
      return lastTerm / (sumPart + lastTerm);
    }
    
    function factorial(n) {
      if (n <= 1) return 1;
      let result = 1;
      for (let i = 2; i <= n; i++) {
        result *= i;
      }
      return result;
    }
    
    // Calcular nível de serviço
    function serviceLevel(a, n, t, aht) {
      const pw = erlangCProbability(a, n);
      return 1 - pw * Math.exp(-(n - a) * (t / aht));
    }
    
    // Iterar até encontrar número de agentes que atinge o nível de serviço
    let currentSL = 0;
    while (currentSL < targetServiceLevel && agents < 1000) {
      agents++;
      currentSL = serviceLevel(trafficIntensity, agents, targetAnswerTime, avgHandleTime);
    }
    
    // Aplicar shrinkage (Gross Staffing)
    const grossAgents = shrinkage > 0 ? Math.ceil(agents / (1 - shrinkage)) : agents;

    return {
      agentsRequired: agents,
      grossAgentsRequired: grossAgents,
      serviceLevel: Math.round(currentSL * 100 * 100) / 100,
      trafficIntensity: Math.round(trafficIntensity * 100) / 100,
      shrinkage: shrinkage * 100,
      error: null
    };
  } catch (error) {
    console.error("[ErlangC] Erro:", error.message);
    return { agentsRequired: 0, serviceLevel: 0, error: error.message };
  }
}

/**
 * Gross Staffing (Dimensionamento Bruto)
 * 
 * Adiciona ao Erlang-C as perdas por "Shrinkage" (pausas, férias, absenteísmo, treinamentos).
 * 
 * Recomendação HDI: Utilizar para o planejamento do 2º Nível
 */
function calcGrossStaffing(baseStaff, shrinkageFactors = {}) {
  try {
    const {
      vacation = 0.05,      // Férias (5%)
      sickLeave = 0.03,     // Absenteísmo (3%)
      breaks = 0.10,        // Pausas (10%)
      training = 0.02,      // Treinamentos (2%)
      meetings = 0.02       // Reuniões (2%)
    } = shrinkageFactors;

    const totalShrinkage = vacation + sickLeave + breaks + training + meetings;
    const grossStaff = Math.ceil(baseStaff / (1 - totalShrinkage));

    return {
      baseStaff,
      grossStaff,
      totalShrinkage: Math.round(totalShrinkage * 100 * 100) / 100,
      breakdown: {
        vacation: Math.round(vacation * 100 * 100) / 100,
        sickLeave: Math.round(sickLeave * 100 * 100) / 100,
        breaks: Math.round(breaks * 100 * 100) / 100,
        training: Math.round(training * 100 * 100) / 100,
        meetings: Math.round(meetings * 100 * 100) / 100
      },
      error: null
    };
  } catch (error) {
    console.error("[GrossStaffing] Erro:", error.message);
    return { baseStaff: 0, grossStaff: 0, totalShrinkage: 0, error: error.message };
  }
}

// ============================================================================
// C. QUALIDADE E SATISFAÇÃO
// ============================================================================

/**
 * Utilização de Pessoal (Occupancy Rate)
 * 
 * Definição HDI: Tempo que o analista passa efetivamente trabalhando em tickets
 * versus o tempo disponível.
 * 
 * Fórmula: (Tempo Falando + Tempo Pós-Atendimento) / Tempo Total Logado × 100
 */
function calcOccupancyRate(agentData) {
  try {
    const {
      talkTime = 0,           // Tempo falando/atendendo (minutos)
      afterCallWork = 0,      // Tempo pós-atendimento (minutos)
      totalLoggedTime = 0     // Tempo total logado (minutos)
    } = agentData;

    if (totalLoggedTime <= 0) {
      return { rate: 0, error: "Tempo logado não informado" };
    }

    const productiveTime = talkTime + afterCallWork;
    const rate = (productiveTime / totalLoggedTime) * 100;

    return {
      rate: Math.round(rate * 100) / 100,
      productiveTime,
      totalLoggedTime,
      idleTime: totalLoggedTime - productiveTime,
      error: null
    };
  } catch (error) {
    console.error("[OccupancyRate] Erro:", error.message);
    return { rate: 0, error: error.message };
  }
}

/**
 * Backlog (Passivo)
 * 
 * Definição HDI: Volume de tickets abertos acumulados e sua idade.
 * 
 * Cálculo: Contagem simples de Tickets Abertos vs. Tickets Fechados no período
 */
function calcBacklog(tickets, options = {}) {
  try {
    const { startDate, endDate } = options;
    const start = startDate ? new Date(startDate + "T00:00:00") : null;
    const end = endDate ? new Date(endDate + "T23:59:59") : null;
    const now = new Date();

    let openTickets = 0;
    let closedTickets = 0;
    let totalAgeMinutes = 0;
    const ageDistribution = {
      lessThan24h: 0,
      between24hAnd72h: 0,
      between72hAnd7d: 0,
      moreThan7d: 0
    };

    tickets.forEach(ticket => {
      if (start || end) {
        const created = new Date(ticket.created_at);
        if (start && created < start) return;
        if (end && created > end) return;
      }

      const resolvedAtStr = ticket.resolved_at || ticket.closed_at || ticket.stats?.resolved_at;
      
      if (resolvedAtStr) {
        closedTickets++;
      } else {
        openTickets++;
        
        // Calcular idade do ticket
        const created = new Date(ticket.created_at);
        const ageMs = now.getTime() - created.getTime();
        const ageMinutes = ageMs / (1000 * 60);
        const ageHours = ageMinutes / 60;
        const ageDays = ageHours / 24;
        
        totalAgeMinutes += ageMinutes;
        
        if (ageHours < 24) {
          ageDistribution.lessThan24h++;
        } else if (ageDays < 3) {
          ageDistribution.between24hAnd72h++;
        } else if (ageDays < 7) {
          ageDistribution.between72hAnd7d++;
        } else {
          ageDistribution.moreThan7d++;
        }
      }
    });

    const avgAgeMinutes = openTickets > 0 ? totalAgeMinutes / openTickets : 0;
    const avgAgeHours = avgAgeMinutes / 60;

    return {
      openTickets,
      closedTickets,
      netBacklog: openTickets - closedTickets,
      avgAgeHours: Math.round(avgAgeHours * 100) / 100,
      ageDistribution,
      error: null
    };
  } catch (error) {
    console.error("[Backlog] Erro:", error.message);
    return { openTickets: 0, closedTickets: 0, netBacklog: 0, error: error.message };
  }
}

/**
 * CSAT (Customer Satisfaction)
 */
function calcCSAT(tickets, options = {}) {
  try {
    const { startDate, endDate } = options;
    const start = startDate ? new Date(startDate + "T00:00:00") : null;
    const end = endDate ? new Date(endDate + "T23:59:59") : null;

    let csatSum = 0;
    let csatCount = 0;
    let positiveCount = 0; // Rating >= 4 (escala 1-5)

    tickets.forEach(ticket => {
      if (start || end) {
        const created = new Date(ticket.created_at);
        if (start && created < start) return;
        if (end && created > end) return;
      }

      const rating = ticket.satisfaction_rating?.rating ?? 
                     ticket.custom_fields?.cf_csat_rating ??
                     ticket.feedback?.rating;

      if (typeof rating === "number" && rating > 0) {
        csatSum += rating;
        csatCount++;
        if (rating >= 4) positiveCount++;
      }
    });

    const average = csatCount > 0 ? csatSum / csatCount : 0;
    const positiveRate = csatCount > 0 ? (positiveCount / csatCount) * 100 : 0;

    return {
      average: Math.round(average * 100) / 100,
      positiveRate: Math.round(positiveRate * 100) / 100,
      total: csatCount,
      positiveCount,
      error: null
    };
  } catch (error) {
    console.error("[CSAT] Erro:", error.message);
    return { average: 0, positiveRate: 0, total: 0, error: error.message };
  }
}

// ============================================================================
// FUNÇÃO AGREGADORA: CALCULA TODAS AS MÉTRICAS HDI
// ============================================================================
function calcAllHdiMetrics(tickets, calls = [], options = {}) {
  const { startDate, endDate, budget = 0, workforceParams = {} } = options;
  const dateOptions = { startDate, endDate };

  const fcr = calcFCR(tickets, dateOptions);
  const flr = calcFLR(tickets, dateOptions);
  const abandonmentRate = calcAbandonmentRate(calls, dateOptions);
  const costPerTicket = calcCostPerTicket(budget, tickets.length);
  const backlog = calcBacklog(tickets, dateOptions);
  const csat = calcCSAT(tickets, dateOptions);

  // Erlang-C se parâmetros fornecidos
  let erlangC = null;
  if (workforceParams.callsPerHour && workforceParams.avgHandleTime) {
    erlangC = calcErlangC(workforceParams);
  }

  return {
    fcr,
    flr,
    abandonmentRate,
    costPerTicket,
    backlog,
    csat,
    erlangC,
    totalTickets: tickets.length,
    totalCalls: calls.length
  };
}

// ============================================================================
// EXPORTS
// ============================================================================
module.exports = {
  calcFCR,
  calcFLR,
  calcAbandonmentRate,
  calcCostPerTicket,
  calcErlangC,
  calcGrossStaffing,
  calcOccupancyRate,
  calcBacklog,
  calcCSAT,
  calcAllHdiMetrics
};
