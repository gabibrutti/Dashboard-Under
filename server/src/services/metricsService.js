/**
 * Serviço Modular de Métricas do Dashboard
 * 
 * Cada função é independente, calcula uma métrica específica a partir de tickets,
 * e possui tratamento de erros isolado para não quebrar o dashboard inteiro.
 * 
 * NOTA: Este serviço recebe os tickets já carregados (para evitar múltiplas
 * chamadas à API do Freshservice). Use getTickets() do freshservice.js primeiro.
 */

// ============================================================================
// CONFIGURAÇÃO DE SLA POR GRUPO (em minutos)
// ============================================================================
const SLA_CONFIG = {
  // Suporte: Responder 15min, Resolver varia por prioridade
  suporte: {
    firstResponse: 15, // 15 minutos para todas as prioridades
    resolution: {
      urgente: 120,    // 2 horas
      alta: 240,       // 4 horas
      media: 1440,     // 24 horas
      baixa: 4320,     // 72 horas
    },
  },
  // Delivery: Responder 15min, Resolver 120h para todas
  delivery: {
    firstResponse: 15,
    resolution: {
      urgente: 7200,   // 120 horas (5 dias)
      alta: 7200,
      media: 7200,
      baixa: 7200,
    },
  },
  // Data Center: usar mesmas metas do Suporte por padrão
  datacenter: {
    firstResponse: 15,
    resolution: {
      urgente: 120,
      alta: 240,
      media: 1440,
      baixa: 4320,
    },
  },
  // Qualidade: usar mesmas metas do Delivery
  qualidade: {
    firstResponse: 15,
    resolution: {
      urgente: 7200,
      alta: 7200,
      media: 7200,
      baixa: 7200,
    },
  },
  // Registros de Ligações: usar mesmas metas do Suporte
  registros: {
    firstResponse: 15,
    resolution: {
      urgente: 120,
      alta: 240,
      media: 1440,
      baixa: 4320,
    },
  },
  // Suporte Interno: usar mesmas metas do Suporte
  suporteInterno: {
    firstResponse: 15,
    resolution: {
      urgente: 120,
      alta: 240,
      media: 1440,
      baixa: 4320,
    },
  },
  // Padrão para grupos não mapeados
  default: {
    firstResponse: 15,
    resolution: {
      urgente: 120,
      alta: 240,
      media: 1440,
      baixa: 4320,
    },
  },
};

// Função para obter configuração de SLA baseada no nome do grupo
function getSlaConfig(groupName) {
  if (!groupName) return SLA_CONFIG.default;
  
  const name = groupName.toLowerCase();
  
  if (name.includes("delivery")) return SLA_CONFIG.delivery;
  if (name.includes("data center") || name.includes("datacenter")) return SLA_CONFIG.datacenter;
  if (name.includes("qualidade")) return SLA_CONFIG.qualidade;
  if (name.includes("registros") || name.includes("ligações") || name.includes("ligacoes")) return SLA_CONFIG.registros;
  if (name.includes("suporte interno")) return SLA_CONFIG.suporteInterno;
  if (name.includes("suporte")) return SLA_CONFIG.suporte;
  
  return SLA_CONFIG.default;
}

function handleMetricError(metricName, error) {
  console.error(`[${metricName}] Erro:`, error.message || error);
  return error.message || "Erro desconhecido";
}

// ============================================================================
// MÉTRICA 1: TICKETS RECEBIDOS
// ============================================================================
function calcTicketsRecebidos(tickets, startDate, endDate) {
  try {
    const start = new Date(startDate + "T00:00:00");
    const end = new Date(endDate + "T23:59:59");

    const filtered = tickets.filter((t) => {
      if (!t.created_at) return false;
      const created = new Date(t.created_at);
      return created >= start && created <= end;
    });

    return { value: filtered.length, error: null };
  } catch (error) {
    return { value: 0, error: handleMetricError("TicketsRecebidos", error) };
  }
}

// ============================================================================
// MÉTRICA 2: TICKETS RESOLVIDOS
// Conta tickets onde resolved_at (Data de Resolução) está dentro do período
// ============================================================================
function calcTicketsResolvidos(tickets, startDate, endDate) {
  try {
    const start = new Date(startDate + "T00:00:00");
    const end = new Date(endDate + "T23:59:59");

    const filtered = tickets.filter((t) => {
      // Pegar data de resolução (stats.resolved_at ou resolved_at)
      const resolvedAt = t.stats?.resolved_at || t.resolved_at;
      if (!resolvedAt) return false;

      // Verificar se foi resolvido no período
      const resolved = new Date(resolvedAt);
      return resolved >= start && resolved <= end;
    });

    console.log(`[calcTicketsResolvidos] ${filtered.length} tickets resolvidos no período`);
    return { value: filtered.length, error: null };
  } catch (error) {
    return { value: 0, error: handleMetricError("TicketsResolvidos", error) };
  }
}

// ============================================================================
// MÉTRICA 3: TICKETS NÃO RESOLVIDOS
// Conta tickets criados no período que ainda não têm resolved_at
// ============================================================================
function calcTicketsNaoResolvidos(tickets, startDate, endDate) {
  try {
    const start = new Date(startDate + "T00:00:00");
    const end = new Date(endDate + "T23:59:59");

    const filtered = tickets.filter((t) => {
      // Verificar se foi criado no período
      const created = new Date(t.created_at);
      if (created < start || created > end) return false;

      // Verificar se NÃO tem data de resolução
      const resolvedAt = t.stats?.resolved_at || t.resolved_at;
      return !resolvedAt;
    });

    console.log(`[calcTicketsNaoResolvidos] ${filtered.length} tickets não resolvidos no período`);
    return { value: filtered.length, error: null };
  } catch (error) {
    return { value: 0, error: handleMetricError("TicketsNaoResolvidos", error) };
  }
}

// ============================================================================
// MÉTRICA 4: % SLA DE RESOLUÇÃO
// Porcentagem de tickets resolvidos no período que estavam dentro do prazo
// ============================================================================
function calcSlaResolucao(tickets, startDate, endDate) {
  try {
    const start = new Date(startDate + "T00:00:00");
    const end = new Date(endDate + "T23:59:59");

    let total = 0;
    let onTime = 0;

    tickets.forEach((t) => {
      // Pegar data de resolução
      const resolvedAt = t.stats?.resolved_at || t.resolved_at;
      if (!resolvedAt) return;

      // Verificar se foi resolvido no período
      const resolved = new Date(resolvedAt);
      if (resolved < start || resolved > end) return;

      total += 1;

      // Verificar SLA: usar stats.resolution_time_within_sla
      const isOnTime = t.stats?.resolution_time_within_sla === true;

      if (isOnTime) onTime += 1;
    });

    const value = total > 0 ? (onTime / total) * 100 : 0;
    console.log(`[calcSlaResolucao] ${onTime}/${total} dentro do SLA = ${value.toFixed(1)}%`);
    return { value, error: null };
  } catch (error) {
    return { value: 0, error: handleMetricError("SlaResolucao", error) };
  }
}

// ============================================================================
// MÉTRICA 5: TEMPO MÉDIO DE RESOLUÇÃO (minutos)
// Tempo desde entrada no grupo selecionado até status resolvido
// Se não houver grupo selecionado, usa created_at como referência
// ============================================================================
function calcTempoMedioResolucao(tickets, startDate, endDate, groupId = null) {
  try {
    const start = new Date(startDate + "T00:00:00");
    const end = new Date(endDate + "T23:59:59");

    let somaMinutos = 0;
    let count = 0;

    tickets.forEach((t) => {
      // Pegar data de resolução
      const resolvedAt = t.stats?.resolved_at || t.resolved_at;
      if (!resolvedAt) return;

      // Verificar se foi resolvido no período
      const resolved = new Date(resolvedAt);
      if (resolved < start || resolved > end) return;

      // Determinar o ponto de início:
      // - Se há grupo selecionado e o ticket tem group_updated_at, usar essa data
      // - Caso contrário, usar created_at
      let startTime;
      if (groupId && t.group_updated_at) {
        startTime = new Date(t.group_updated_at);
      } else if (groupId && t.stats?.group_stations_at) {
        // Alternativa: usar stats.group_stations_at se disponível
        startTime = new Date(t.stats.group_stations_at);
      } else {
        startTime = new Date(t.created_at);
      }

      const diffMinutes = (resolved.getTime() - startTime.getTime()) / (1000 * 60);

      if (diffMinutes > 0) {
        somaMinutos += diffMinutes;
        count += 1;
      }
    });

    const value = count > 0 ? somaMinutos / count : 0;
    console.log(`[calcTempoMedioResolucao] ${count} tickets, média ${value.toFixed(1)} min`);
    return { value, error: null };
  } catch (error) {
    return { value: 0, error: handleMetricError("TempoMedioResolucao", error) };
  }
}

// ============================================================================
// MÉTRICA 6: TEMPO MÉDIO 1ª RESPOSTA (minutos)
// Tempo desde entrada no grupo selecionado até primeira resposta do agente
// Se não houver grupo selecionado, usa created_at como referência
// ============================================================================
function calcTempoMedioPrimeiraResposta(tickets, startDate, endDate, groupId = null) {
  try {
    const start = new Date(startDate + "T00:00:00");
    const end = new Date(endDate + "T23:59:59");

    let somaMinutos = 0;
    let count = 0;

    tickets.forEach((t) => {
      if (!t.created_at) return;

      const created = new Date(t.created_at);
      if (created < start || created > end) return;

      const firstResponseAt = t.first_responded_at || t.stats?.first_responded_at;
      if (!firstResponseAt) return;

      // Determinar o ponto de início:
      // - Se há grupo selecionado e o ticket tem group_updated_at, usar essa data
      // - Caso contrário, usar created_at
      let startTime;
      if (groupId && t.group_updated_at) {
        startTime = new Date(t.group_updated_at);
      } else if (groupId && t.stats?.group_stations_at) {
        startTime = new Date(t.stats.group_stations_at);
      } else {
        startTime = new Date(t.created_at);
      }

      const firstResp = new Date(firstResponseAt).getTime();
      const diffMinutes = (firstResp - startTime.getTime()) / (1000 * 60);

      if (diffMinutes > 0) {
        somaMinutos += diffMinutes;
        count += 1;
      }
    });

    const value = count > 0 ? somaMinutos / count : 0;
    return { value, error: null };
  } catch (error) {
    return { value: 0, error: handleMetricError("TempoMedioPrimeiraResposta", error) };
  }
}

// ============================================================================
// MÉTRICA 7: TAXA DE REABERTURA (%)
// ============================================================================
function calcTaxaReabertura(tickets, startDate, endDate) {
  try {
    const start = new Date(startDate + "T00:00:00");
    const end = new Date(endDate + "T23:59:59");
    const resolvedStatuses = [4, 5, "resolved", "closed"];

    let totalResolvidos = 0;
    let reabertos = 0;

    tickets.forEach((t) => {
      if (!resolvedStatuses.includes(t.status)) return;

      const resolvedAt = t.resolved_at || t.closed_at || t.stats?.resolved_at || t.stats?.closed_at;
      if (!resolvedAt) return;

      const resolved = new Date(resolvedAt);
      if (resolved < start || resolved > end) return;

      totalResolvidos += 1;

      // Freshservice: stats.reopened indica se foi reaberto
      if (t.stats?.reopened > 0 || t.reopened === true) {
        reabertos += 1;
      }
    });

    const value = totalResolvidos > 0 ? (reabertos / totalResolvidos) * 100 : 0;
    return { value, error: null };
  } catch (error) {
    return { value: 0, error: handleMetricError("TaxaReabertura", error) };
  }
}

// ============================================================================
// MÉTRICA 8: CSAT MÉDIO
// ============================================================================
function calcCsatMedio(tickets, startDate, endDate) {
  try {
    const start = new Date(startDate + "T00:00:00");
    const end = new Date(endDate + "T23:59:59");
    const resolvedStatuses = [4, 5, "resolved", "closed"];

    let soma = 0;
    let count = 0;

    tickets.forEach((t) => {
      if (!resolvedStatuses.includes(t.status)) return;

      const resolvedAt = t.resolved_at || t.closed_at || t.stats?.resolved_at || t.stats?.closed_at;
      if (!resolvedAt) return;

      const resolved = new Date(resolvedAt);
      if (resolved < start || resolved > end) return;

      // Freshservice: feedback.rating ou csat_rating
      const score = t.feedback?.rating || t.csat_rating;
      if (typeof score === "number" && score > 0) {
        soma += score;
        count += 1;
      }
    });

    const value = count > 0 ? soma / count : 0;
    return { value, count, error: null };
  } catch (error) {
    return { value: 0, count: 0, error: handleMetricError("CsatMedio", error) };
  }
}

// ============================================================================
// FUNÇÃO AGREGADORA: CALCULA TODAS AS MÉTRICAS
// ============================================================================
function calcAllMetrics(tickets, startDate, endDate, groupId = null, groupName = null) {
  // Obter configuração de SLA do grupo
  const slaConfig = getSlaConfig(groupName);
  
  return {
    ticketsRecebidos: calcTicketsRecebidos(tickets, startDate, endDate),
    ticketsResolvidos: calcTicketsResolvidos(tickets, startDate, endDate),
    ticketsNaoResolvidos: calcTicketsNaoResolvidos(tickets, startDate, endDate),
    slaResolucao: calcSlaResolucao(tickets, startDate, endDate),
    tempoMedioResolucao: calcTempoMedioResolucao(tickets, startDate, endDate, groupId),
    tempoMedioPrimeiraResposta: calcTempoMedioPrimeiraResposta(tickets, startDate, endDate, groupId),
    taxaReabertura: calcTaxaReabertura(tickets, startDate, endDate),
    csatMedio: calcCsatMedio(tickets, startDate, endDate),
    // Incluir configuração de SLA na resposta
    slaConfig: {
      firstResponse: slaConfig.firstResponse,
      resolution: slaConfig.resolution,
    },
  };
}

// ============================================================================
// EXPORTS
// ============================================================================
module.exports = {
  calcTicketsRecebidos,
  calcTicketsResolvidos,
  calcTicketsNaoResolvidos,
  calcSlaResolucao,
  calcTempoMedioResolucao,
  calcTempoMedioPrimeiraResposta,
  calcTaxaReabertura,
  calcCsatMedio,
  calcAllMetrics,
  getSlaConfig,
  SLA_CONFIG,
};
