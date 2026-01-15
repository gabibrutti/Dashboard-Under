/**
 * Serviço de Métricas HDI-SCC Completas
 * 
 * Implementa todas as métricas do padrão HDI Support Center Certification:
 * - Resultados da Experiência de Pessoas
 * - Resultados da Experiência do Cliente
 * - Resultados de Desempenho
 */

// ============================================================================
// A. RESULTADOS DA EXPERIÊNCIA DE PESSOAS
// ============================================================================

/**
 * eNPS - Employee Net Promoter Score
 * Fórmula: %eNPS = % Promotores - % Detratores
 */
function calcENPS(surveyData = {}) {
  const { promoters = 0, detractors = 0, passives = 0 } = surveyData;
  const total = promoters + detractors + passives;
  
  if (total === 0) {
    return {
      score: 0,
      promoters: 0,
      detractors: 0,
      passives: 0,
      total: 0,
      formula: "%eNPS = % Promotores - % Detratores",
    };
  }
  
  const promoterPercent = (promoters / total) * 100;
  const detractorPercent = (detractors / total) * 100;
  const score = promoterPercent - detractorPercent;
  
  return {
    score: Math.round(score * 100) / 100,
    promoters: Math.round(promoterPercent * 100) / 100,
    detractors: Math.round(detractorPercent * 100) / 100,
    passives: Math.round(((passives / total) * 100) * 100) / 100,
    total,
    formula: "%eNPS = % Promotores - % Detratores",
  };
}

/**
 * Resumo de chamadas (telefonia)
 */
function calcCallSummary(calls = [], options = {}) {
  const { startDate, endDate } = options;
  const start = startDate ? new Date(startDate + "T00:00:00") : null;
  const end = endDate ? new Date(endDate + "T23:59:59") : null;

  let inbound = 0;
  let answered = 0;
  let abandoned = 0;

  calls.forEach(call => {
    const callDate = call.startedAt || call.data_inicio || call.started_at;
    if (start || end) {
      const callTime = new Date(callDate);
      if (start && callTime < start) return;
      if (end && callTime > end) return;
    }

    if (call.direction === 'inbound' || call.direcao === 'entrada') {
      inbound += 1;
      if (call.answered || call.atendida) answered += 1;
      if (call.abandoned || call.abandonada || call.status === 'abandonada' || call.status === 'abandoned') abandoned += 1;
    }
  });

  return {
    total: inbound,
    inbound,
    answered,
    abandoned,
    formula: "Resumo telefonia: recebidas, atendidas e abandonadas (Zenvia)",
  };
}

/**
 * Turnover
 * Fórmula: % Turnover = ((Analistas que saíram) / Total de Analistas) × 100
 */
function calcTurnover(staffData = {}) {
  const { left = 0, total = 0 } = staffData;
  
  const rate = total > 0 ? (left / total) * 100 : 0;
  
  return {
    rate: Math.round(rate * 100) / 100,
    left,
    total,
    formula: "% Turnover = ((Analistas que saíram) / Total de Analistas) × 100",
  };
}

/**
 * Absenteísmo (Ausências não Planejadas)
 * Fórmula: % Absenteísmo = (∑ Atrasos e faltas não planejadas) / (∑ Horas planejadas × Qtd analistas) × 100
 */
function calcAbsenteeism(absenceData = {}) {
  const { unplannedHours = 0, plannedHours = 0, totalAnalysts = 0 } = absenceData;
  
  const totalPlannedHours = plannedHours * totalAnalysts;
  const rate = totalPlannedHours > 0 ? (unplannedHours / totalPlannedHours) * 100 : 0;
  
  return {
    rate: Math.round(rate * 100) / 100,
    unplannedHours,
    plannedHours,
    totalAnalysts,
    formula: "% Absenteísmo = (∑ Atrasos e faltas não planejadas) / (∑ Horas planejadas × Qtd analistas) × 100",
  };
}

/**
 * Utilização de Pessoal
 * Fórmula: % Utilização = (∑ TMA × Qtd contatos por touchpoint) / (∑ Horas planejadas × Qtd Analistas) × 100
 */
function calcStaffUtilization(utilizationData = {}) {
  const { 
    tmaByTouchpoint = { phone: 0, email: 0, chat: 0, portal: 0 },
    contactsByTouchpoint = { phone: 0, email: 0, chat: 0, portal: 0 },
    plannedHours = 0,
    totalAnalysts = 0
  } = utilizationData;
  
  const totalPlannedMinutes = plannedHours * 60 * totalAnalysts;
  
  const utilizationByTouchpoint = {};
  let totalWorkMinutes = 0;
  
  for (const touchpoint of ['phone', 'email', 'chat', 'portal']) {
    const tma = tmaByTouchpoint[touchpoint] || 0;
    const contacts = contactsByTouchpoint[touchpoint] || 0;
    const workMinutes = tma * contacts;
    totalWorkMinutes += workMinutes;
    
    utilizationByTouchpoint[touchpoint] = totalPlannedMinutes > 0 
      ? Math.round((workMinutes / totalPlannedMinutes) * 100 * 100) / 100 
      : 0;
  }
  
  const overallRate = totalPlannedMinutes > 0 ? (totalWorkMinutes / totalPlannedMinutes) * 100 : 0;
  
  return {
    rate: Math.round(overallRate * 100) / 100,
    byTouchpoint: utilizationByTouchpoint,
    formula: "% Utilização = (∑ TMA × Qtd contatos por touchpoint) / (∑ Horas planejadas × Qtd Analistas) × 100",
  };
}

// ============================================================================
// B. RESULTADOS DA EXPERIÊNCIA DO CLIENTE
// ============================================================================

// Helper: verificar se ticket é incidente/requisição
function isIncidentOrRequest(ticket) {
  const allowedTypes = ["incident", "incidente", "service request", "request", "requisição", "requisicao"];
  const typeRaw =
    ticket.type ||
    ticket.ticket_type ||
    ticket.custom_fields?.cf_ticket_type ||
    "";
  const type = String(typeRaw).toLowerCase();
  if (!type) return false;
  return allowedTypes.some((t) => type.includes(t));
}

/**
 * NPS - Net Promoter Score (Pesquisa Periódica)
 * Fórmula: % NPS = % Promotores - % Detratores
 */
function calcCustomerNPS(surveyData = {}) {
  const { promoters = 0, detractors = 0, passives = 0 } = surveyData;
  const total = promoters + detractors + passives;
  
  if (total === 0) {
    return {
      score: 0,
      promoters: 0,
      detractors: 0,
      passives: 0,
      total: 0,
      formula: "% NPS = % Promotores - % Detratores",
    };
  }
  
  const promoterPercent = (promoters / total) * 100;
  const detractorPercent = (detractors / total) * 100;
  const score = promoterPercent - detractorPercent;
  
  return {
    score: Math.round(score * 100) / 100,
    promoters: Math.round(promoterPercent * 100) / 100,
    detractors: Math.round(detractorPercent * 100) / 100,
    passives: Math.round(((passives / total) * 100) * 100) / 100,
    total,
    formula: "% NPS = % Promotores - % Detratores",
  };
}

/**
 * CSAT - Customer Satisfaction (Pesquisa Contínua)
 * Fórmula: % CSAT = (∑ das Respostas / Quantidade Respostas) × 100
 */
function calcCSAT(tickets, options = {}) {
  const { startDate, endDate } = options;
  const start = startDate ? new Date(startDate + "T00:00:00") : null;
  const end = endDate ? new Date(endDate + "T23:59:59") : null;
  
  let csatSum = 0;
  let csatCount = 0;
  
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
      // Normalizar para escala 0-100 se estiver em escala 1-5
      const normalizedRating = rating <= 5 ? (rating / 5) * 100 : rating;
      csatSum += normalizedRating;
      csatCount += 1;
    }
  });
  
  const score = csatCount > 0 ? csatSum / csatCount : 0;
  
  return {
    score: Math.round(score * 100) / 100,
    totalResponses: csatCount,
    sumResponses: Math.round(csatSum * 100) / 100,
    formula: "% CSAT = (∑ das Respostas / Quantidade Respostas) × 100",
  };
}

/**
 * Taxa de Retorno de Feedback
 * Fórmula: % Taxa de Retorno = (∑ Feedbacks respondidos / Qtd Feedbacks recebidos) × 100
 */
function calcFeedbackReturnRate(feedbackData = {}) {
  const { 
    responded = 0, 
    received = 0,
    byTouchpoint = { phone: 0, email: 0, chat: 0, portal: 0 }
  } = feedbackData;
  
  const rate = received > 0 ? (responded / received) * 100 : 0;
  
  return {
    rate: Math.round(rate * 100) / 100,
    responded,
    received,
    byTouchpoint,
    formula: "% Taxa de Retorno = (∑ Feedbacks respondidos / Qtd Feedbacks recebidos) × 100",
  };
}

// ============================================================================
// C. RESULTADOS DE DESEMPENHO
// ============================================================================

/**
 * Número de Incidentes/Requisições Registrados
 * Fórmula: % Registro = (Contatos Registrados / Qtd total de contatos) × 100
 */
function calcRegisteredTickets(tickets, contactsData = {}) {
  const { 
    totalContacts = 0,
    byChannel = { phone: 0, email: 0, chat: 0, portal: 0, chatbot: 0 }
  } = contactsData;

  // Considerar apenas Incidentes/Requisições de Serviço
  const allowedTypes = ["incident", "incidente", "service request", "request", "requisição", "requisicao"];
  const eligibleTickets = tickets.filter((ticket) => {
    const typeRaw =
      ticket.type ||
      ticket.ticket_type ||
      ticket.custom_fields?.cf_ticket_type ||
      "";
    const type = String(typeRaw).toLowerCase();
    if (!type) return false;
    return allowedTypes.some((t) => type.includes(t));
  });

  const registered = eligibleTickets.length;
  const total = totalContacts > 0 ? totalContacts : registered;
  const rate = total > 0 ? (registered / total) * 100 : 0;
  
  // Contar tickets por canal (baseado em source ou custom_fields)
  const registeredByChannel = { phone: 0, email: 0, chat: 0, portal: 0, chatbot: 0 };
  
  eligibleTickets.forEach(ticket => {
    const source = ticket.source || ticket.custom_fields?.cf_source || 'portal';
    const sourceLower = String(source).toLowerCase();
    
    if (sourceLower.includes('phone') || sourceLower.includes('telefone') || source === 2) {
      registeredByChannel.phone += 1;
    } else if (sourceLower.includes('email') || source === 1) {
      registeredByChannel.email += 1;
    } else if (sourceLower.includes('chat') && !sourceLower.includes('chatbot')) {
      registeredByChannel.chat += 1;
    } else if (sourceLower.includes('chatbot') || sourceLower.includes('bot')) {
      registeredByChannel.chatbot += 1;
    } else {
      registeredByChannel.portal += 1;
    }
  });
  
  return {
    rate: Math.round(rate * 100) / 100,
    registered,
    totalContacts: total,
    byChannel: registeredByChannel,
    formula: "% Registro = (Contatos Registrados / Qtd total de contatos) × 100",
  };
}

/**
 * Contatos Recebidos
 */
function calcContactsReceived(tickets, callsData = {}) {
  const { totalCalls = 0 } = callsData;
  
  // Contar tickets por touchpoint
  const byTouchpoint = { phone: totalCalls, email: 0, chat: 0, portal: 0, chatbot: 0 };
  
  tickets.forEach(ticket => {
    const source = ticket.source || ticket.custom_fields?.cf_source || 'portal';
    const sourceLower = String(source).toLowerCase();
    
    // Evitar dupla contagem de telefone: phone fica ancorado nos "contacts" vindos das chamadas
    if (sourceLower.includes('phone') || sourceLower.includes('telefone') || source === 2) {
      return;
    }

    if (sourceLower.includes('email') || source === 1) {
      byTouchpoint.email += 1;
    } else if (sourceLower.includes('chat') && !sourceLower.includes('chatbot')) {
      byTouchpoint.chat += 1;
    } else if (sourceLower.includes('chatbot') || sourceLower.includes('bot')) {
      byTouchpoint.chatbot += 1;
    } else if (!sourceLower.includes('phone') && source !== 2) {
      byTouchpoint.portal += 1;
    }
  });
  
  const total = Object.values(byTouchpoint).reduce((sum, val) => sum + val, 0);
  
  return {
    total,
    byTouchpoint,
  };
}

/**
 * Tempo Médio de Resposta (TMR)
 * Fórmula: TMR = (∑ Tempos de Espera por touchpoint / Qtd total por touchpoint)
 */
function calcAverageResponseTime(tickets, options = {}) {
  const { startDate, endDate } = options;
  const start = startDate ? new Date(startDate + "T00:00:00") : null;
  const end = endDate ? new Date(endDate + "T23:59:59") : null;
  
  let totalResponseMinutes = 0;
  let ticketsWithResponse = 0;
  
  const byTouchpoint = { incidents: 0, requests: 0, phone: 0, email: 0, chat: 0 };
  const countByTouchpoint = { incidents: 0, requests: 0, phone: 0, email: 0, chat: 0 };
  
  tickets.forEach(ticket => {
    if (start || end) {
      const created = new Date(ticket.created_at);
      if (start && created < start) return;
      if (end && created > end) return;
    }
    
    const firstResponded = ticket.first_responded_at || ticket.stats?.first_responded_at;
    if (!firstResponded) return;
    
    const createdAt = new Date(ticket.created_at).getTime();
    const respondedAt = new Date(firstResponded).getTime();
    const responseMinutes = (respondedAt - createdAt) / (1000 * 60);
    
    if (responseMinutes > 0 && responseMinutes < 10080) { // Max 7 dias
      totalResponseMinutes += responseMinutes;
      ticketsWithResponse += 1;
      
      // Classificar por tipo
      const isIncident = ticket.type === 'Incident' || ticket.ticket_type === 1;
      if (isIncident) {
        byTouchpoint.incidents += responseMinutes;
        countByTouchpoint.incidents += 1;
      } else {
        byTouchpoint.requests += responseMinutes;
        countByTouchpoint.requests += 1;
      }
    }
  });
  
  const overall = ticketsWithResponse > 0 ? totalResponseMinutes / ticketsWithResponse : 0;
  
  return {
    overall: Math.round(overall * 100) / 100,
    byTouchpoint: {
      incidents: countByTouchpoint.incidents > 0 ? Math.round((byTouchpoint.incidents / countByTouchpoint.incidents) * 100) / 100 : 0,
      requests: countByTouchpoint.requests > 0 ? Math.round((byTouchpoint.requests / countByTouchpoint.requests) * 100) / 100 : 0,
      phone: 2, // Placeholder - dados de telefonia
      email: 30, // Placeholder
      chat: 5, // Placeholder
    },
    formula: "TMR = (∑ Tempos de Espera por touchpoint / Qtd total por touchpoint)",
  };
}

/**
 * Taxa de Abandono
 * Fórmula: % Abandonos = (Contatos abandonados / Contatos recebidos) × 100
 */
function calcAbandonmentRate(calls = [], options = {}) {
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
    
    total += 1;
    
    if (call.abandoned || call.abandonada || call.status === 'abandonada' || call.status === 'abandoned') {
      abandoned += 1;
    }
  });
  
  const rate = total > 0 ? (abandoned / total) * 100 : 0;
  
  return {
    rate: Math.round(rate * 100) / 100,
    abandoned,
    received: total,
    byChannel: {
      phone: Math.round(rate * 100) / 100,
      chat: 0,
      chatbot: 0,
    },
    formula: "% Abandonos = (Contatos abandonados / Contatos recebidos) × 100",
  };
}

/**
 * Tempo de Resolução de Incidentes
 * Fórmula: % Tempo de Resolução = (Incidentes resolvidos no prazo / Total de incidentes) × 100
 */
function calcResolutionTime(tickets, options = {}) {
  const { startDate, endDate } = options;
  const start = startDate ? new Date(startDate + "T00:00:00") : null;
  const end = endDate ? new Date(endDate + "T23:59:59") : null;
  
  // SLA por prioridade (em minutos)
  const slaByPriority = {
    1: 72 * 60,   // Baixa: 72h
    2: 24 * 60,   // Média: 24h
    3: 4 * 60,    // Alta: 4h
    4: 2 * 60,    // Urgente: 2h
  };
  
  let withinSla = 0;
  let total = 0;
  let incidentsWithinSla = 0;
  let incidentsTotal = 0;
  let requestsWithinSla = 0;
  let requestsTotal = 0;
  
  tickets.forEach(ticket => {
    if (start || end) {
      const created = new Date(ticket.created_at);
      if (start && created < start) return;
      if (end && created > end) return;
    }
    
    const resolvedAtStr = ticket.resolved_at || ticket.stats?.resolved_at || ticket.closed_at || ticket.stats?.closed_at;
    if (!resolvedAtStr) return;
    
    total += 1;
    
    const isIncident = ticket.type === 'Incident' || ticket.ticket_type === 1;
    if (isIncident) {
      incidentsTotal += 1;
    } else {
      requestsTotal += 1;
    }
    
    // Calcular SLA
    let dueBy = ticket.due_by;
    if (!dueBy) {
      const priority = ticket.priority || 2;
      const slaMinutes = slaByPriority[priority] || slaByPriority[2];
      const createdAt = new Date(ticket.created_at).getTime();
      dueBy = new Date(createdAt + slaMinutes * 60 * 1000).toISOString();
    }
    
    const due = new Date(dueBy).getTime();
    const resolved = new Date(resolvedAtStr).getTime();
    
    if (resolved <= due) {
      withinSla += 1;
      if (isIncident) {
        incidentsWithinSla += 1;
      } else {
        requestsWithinSla += 1;
      }
    }
  });
  
  const rate = total > 0 ? (withinSla / total) * 100 : 0;
  
  return {
    rate: Math.round(rate * 100) / 100,
    withinSla,
    total,
    byType: {
      incidents: incidentsTotal > 0 ? Math.round((incidentsWithinSla / incidentsTotal) * 100) : 0,
      requests: requestsTotal > 0 ? Math.round((requestsWithinSla / requestsTotal) * 100) : 0,
    },
    formula: "% Tempo de Resolução = (Incidentes resolvidos no prazo / Total de incidentes) × 100",
  };
}

/**
 * FCR - Taxa de Resolução no Primeiro Contato
 * Fórmula: % FCR = (Incidentes resolvidos no 1º contato / Total de Incidentes) × 100
 */
function calcFCR(tickets, options = {}) {
  const { startDate, endDate } = options;
  const start = startDate ? new Date(startDate + "T00:00:00") : null;
  const end = endDate ? new Date(endDate + "T23:59:59") : null;
  
  const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;
  const eligible = tickets.filter(isIncidentOrRequest);
  let fcrCount = 0;
  let total = 0;
  
  eligible.forEach(ticket => {
    if (start || end) {
      const created = new Date(ticket.created_at);
      if (start && created < start) return;
      if (end && created > end) return;
    }
    
    const resolvedAtStr = ticket.resolved_at || ticket.stats?.resolved_at || ticket.closed_at || ticket.stats?.closed_at;
    if (!resolvedAtStr) return;
    
    total += 1;
    
    const createdAt = new Date(ticket.created_at).getTime();
    const resolvedAt = new Date(resolvedAtStr).getTime();
    const withinTime = resolvedAt - createdAt <= FOUR_HOURS_MS;
    
    const stats = ticket.stats || {};
    const outboundCount = stats.outbound_count || 0;
    const groupEscalated = stats.group_escalated || false;
    
    const isFcr = withinTime || (outboundCount <= 1 && !groupEscalated);
    
    if (isFcr) fcrCount += 1;
  });
  
  const rate = total > 0 ? (fcrCount / total) * 100 : 0;
  
  return {
    rate: Math.round(rate * 100) / 100,
    count: fcrCount,
    total,
    formula: "% FCR = (Incidentes resolvidos no 1º contato / Total de Incidentes) × 100",
  };
}

/**
 * FLR - Taxa de Resolução em Primeiro Nível
 * Fórmula: % FLR = (Incidentes resolvidos no 1º Nível / Total de Incidentes) × 100
 */
function calcFLR(tickets, options = {}) {
  const { startDate, endDate } = options;
  const start = startDate ? new Date(startDate + "T00:00:00") : null;
  const end = endDate ? new Date(endDate + "T23:59:59") : null;
  
  const eligible = tickets.filter(isIncidentOrRequest);
  let flrCount = 0;
  let total = 0;
  
  eligible.forEach(ticket => {
    if (start || end) {
      const created = new Date(ticket.created_at);
      if (start && created < start) return;
      if (end && created > end) return;
    }
    
    const resolvedAtStr = ticket.resolved_at || ticket.stats?.resolved_at || ticket.closed_at || ticket.stats?.closed_at;
    if (!resolvedAtStr) return;
    
    total += 1;
    
    const stats = ticket.stats || {};
    const escalated = Boolean(stats.escalated_to || stats.escalated || stats.group_escalated);
    
    if (!escalated) {
      flrCount += 1;
    }
  });
  
  const rate = total > 0 ? (flrCount / total) * 100 : 0;
  
  return {
    rate: Math.round(rate * 100) / 100,
    count: flrCount,
    total,
    formula: "% FLR = (Incidentes resolvidos no 1º Nível / Total de Incidentes) × 100",
  };
}

/**
 * Taxa de Reabertura
 * Fórmula: % Reabertura = (Incidentes reabertos / Total de Incidentes resolvidos) × 100
 */
function calcReopenedRate(tickets, options = {}) {
  const { startDate, endDate } = options;
  const start = startDate ? new Date(startDate + "T00:00:00") : null;
  const end = endDate ? new Date(endDate + "T23:59:59") : null;
  
  const eligible = tickets.filter(isIncidentOrRequest);
  let reopenedCount = 0;
  let total = 0;
  
  // Por nível (simplificado)
  const byLevel = { n1: 0, n2: 0, n3: 0 };
  const countByLevel = { n1: 0, n2: 0, n3: 0 };
  
  eligible.forEach(ticket => {
    if (start || end) {
      const created = new Date(ticket.created_at);
      if (start && created < start) return;
      if (end && created > end) return;
    }
    
    const resolvedAtStr = ticket.resolved_at || ticket.stats?.resolved_at || ticket.closed_at || ticket.stats?.closed_at;
    if (!resolvedAtStr) return;
    
    total += 1;
    
    // Determinar nível baseado em escalação
    const stats = ticket.stats || {};
    const escalated = Boolean(stats.escalated_to || stats.escalated || stats.group_escalated);
    const level = escalated ? 'n2' : 'n1';
    countByLevel[level] += 1;
    
    if (ticket.reopened_count && ticket.reopened_count > 0) {
      reopenedCount += 1;
      byLevel[level] += 1;
    }
  });
  
  const overall = total > 0 ? (reopenedCount / total) * 100 : 0;
  
  return {
    overall: Math.round(overall * 100) / 100,
    byLevel: {
      n1: countByLevel.n1 > 0 ? Math.round((byLevel.n1 / countByLevel.n1) * 100 * 100) / 100 : 0,
      n2: countByLevel.n2 > 0 ? Math.round((byLevel.n2 / countByLevel.n2) * 100 * 100) / 100 : 0,
      n3: countByLevel.n3 > 0 ? Math.round((byLevel.n3 / countByLevel.n3) * 100 * 100) / 100 : 0,
    },
    count: reopenedCount,
    total,
    formula: "% Reabertura = (Incidentes reabertos / Total de Incidentes resolvidos) × 100",
  };
}

/**
 * Backlog
 * Fórmula: % Backlog = (Incidentes abertos vencidos / Total de Incidentes abertos) × 100
 */
function calcBacklog(tickets, options = {}) {
  const now = new Date();
  const eligible = tickets.filter(isIncidentOrRequest);
  
  // SLA por prioridade (em minutos)
  const slaByPriority = {
    1: 72 * 60,
    2: 24 * 60,
    3: 4 * 60,
    4: 2 * 60,
  };
  
  let overdueOpen = 0;
  let totalOpen = 0;
  
  const ageDistribution = {
    lessThan24h: 0,
    between24hAnd72h: 0,
    between72hAnd7d: 0,
    moreThan7d: 0,
  };
  
  eligible.forEach(ticket => {
    const resolvedAtStr = ticket.resolved_at || ticket.stats?.resolved_at || ticket.closed_at || ticket.stats?.closed_at;
    if (resolvedAtStr) return; // Ticket resolvido
    
    totalOpen += 1;
    
    // Calcular idade
    const created = new Date(ticket.created_at);
    const ageMs = now.getTime() - created.getTime();
    const ageHours = ageMs / (1000 * 60 * 60);
    const ageDays = ageHours / 24;
    
    if (ageHours < 24) {
      ageDistribution.lessThan24h += 1;
    } else if (ageDays < 3) {
      ageDistribution.between24hAnd72h += 1;
    } else if (ageDays < 7) {
      ageDistribution.between72hAnd7d += 1;
    } else {
      ageDistribution.moreThan7d += 1;
    }
    
    // Verificar se está vencido
    let dueBy = ticket.due_by;
    if (!dueBy) {
      const priority = ticket.priority || 2;
      const slaMinutes = slaByPriority[priority] || slaByPriority[2];
      dueBy = new Date(created.getTime() + slaMinutes * 60 * 1000).toISOString();
    }
    
    const due = new Date(dueBy).getTime();
    if (now.getTime() > due) {
      overdueOpen += 1;
    }
  });
  
  const rate = totalOpen > 0 ? (overdueOpen / totalOpen) * 100 : 0;
  
  return {
    rate: Math.round(rate * 100) / 100,
    overdueOpen,
    totalOpen,
    ageDistribution,
    formula: "% Backlog = (Incidentes abertos vencidos / Total de Incidentes abertos) × 100",
  };
}

/**
 * Escalação Hierárquica
 * Fórmula: % Escalação = (Incidentes escalados para gestões / Total de Incidentes) × 100
 */
function calcHierarchicalEscalation(tickets, options = {}) {
  const eligible = tickets.filter(isIncidentOrRequest);
  let escalated = 0;
  const total = eligible.length;
  
  eligible.forEach(ticket => {
    const stats = ticket.stats || {};
    // Escalação hierárquica geralmente envolve mudança para grupo de gestão
    if (stats.escalated_to_management || stats.hierarchical_escalation) {
      escalated += 1;
    }
  });
  
  const rate = total > 0 ? (escalated / total) * 100 : 0;
  
  return {
    rate: Math.round(rate * 100) / 100,
    escalated,
    total,
    formula: "% Escalação = (Incidentes escalados para gestões / Total de Incidentes) × 100",
  };
}

/**
 * Escalação Funcional Interna
 * Fórmula: % Escalação = (Incidentes escalados dentro do CS / Total de Incidentes) × 100
 */
function calcInternalFunctionalEscalation(tickets, options = {}) {
  const eligible = tickets.filter(isIncidentOrRequest);
  let escalated = 0;
  const total = eligible.length;
  
  eligible.forEach(ticket => {
    const stats = ticket.stats || {};
    if (stats.group_escalated || stats.escalated_to_group_id) {
      escalated += 1;
    }
  });
  
  const rate = total > 0 ? (escalated / total) * 100 : 0;
  
  return {
    rate: Math.round(rate * 100) / 100,
    escalated,
    total,
    formula: "% Escalação = (Incidentes escalados dentro do CS / Total de Incidentes) × 100",
  };
}

/**
 * Escalação Funcional Externa
 * Fórmula: % Escalação = (Incidentes escalados para fora que poderiam ser resolvidos / Total solucionados) × 100
 */
function calcExternalFunctionalEscalation(tickets, options = {}) {
  const eligible = tickets.filter(isIncidentOrRequest);
  let escalated = 0;
  let total = 0;
  
  eligible.forEach(ticket => {
    const resolvedAtStr = ticket.resolved_at || ticket.stats?.resolved_at || ticket.closed_at || ticket.stats?.closed_at;
    if (!resolvedAtStr) return;
    
    total += 1;
    
    const stats = ticket.stats || {};
    // Escalação externa - para grupos fora do centro de suporte
    if (stats.escalated_to_external || stats.external_escalation) {
      escalated += 1;
    }
  });
  
  const rate = total > 0 ? (escalated / total) * 100 : 0;
  
  return {
    rate: Math.round(rate * 100) / 100,
    escalated,
    total,
    formula: "% Escalação = (Incidentes escalados para fora que poderiam ser resolvidos / Total solucionados) × 100",
  };
}

/**
 * Distribuição dos Tempos de Resolução por Grupo
 * Fórmula: % Tempo Distribuição = (Incidentes resolvidos no prazo por grupo / Total por grupo) × 100
 */
function calcResolutionTimeDistribution(tickets, groups = [], options = {}) {
  const slaByPriority = {
    1: 72 * 60,
    2: 24 * 60,
    3: 4 * 60,
    4: 2 * 60,
  };
  
  const byGroup = {};
  let totalWithinSla = 0;
  let totalResolved = 0;
  
  // Criar mapa de grupos
  const groupMap = new Map();
  groups.forEach(g => groupMap.set(g.id, g.name));
  
  tickets.forEach(ticket => {
    const resolvedAtStr = ticket.resolved_at || ticket.stats?.resolved_at || ticket.closed_at || ticket.stats?.closed_at;
    if (!resolvedAtStr) return;
    
    const groupId = ticket.group_id;
    const groupName = groupMap.get(groupId) || `Grupo ${groupId}`;
    
    if (!byGroup[groupName]) {
      byGroup[groupName] = { withinSla: 0, total: 0, rate: 0 };
    }
    
    byGroup[groupName].total += 1;
    totalResolved += 1;
    
    // Verificar SLA
    let dueBy = ticket.due_by;
    if (!dueBy) {
      const priority = ticket.priority || 2;
      const slaMinutes = slaByPriority[priority] || slaByPriority[2];
      const createdAt = new Date(ticket.created_at).getTime();
      dueBy = new Date(createdAt + slaMinutes * 60 * 1000).toISOString();
    }
    
    const due = new Date(dueBy).getTime();
    const resolved = new Date(resolvedAtStr).getTime();
    
    if (resolved <= due) {
      byGroup[groupName].withinSla += 1;
      totalWithinSla += 1;
    }
  });
  
  // Calcular taxas por grupo
  for (const groupName of Object.keys(byGroup)) {
    const group = byGroup[groupName];
    group.rate = group.total > 0 ? Math.round((group.withinSla / group.total) * 100 * 100) / 100 : 0;
  }
  
  const overallRate = totalResolved > 0 ? (totalWithinSla / totalResolved) * 100 : 0;
  
  return {
    rate: Math.round(overallRate * 100) / 100,
    withinSlaByGroup: totalWithinSla,
    totalByGroup: totalResolved,
    byGroup,
    formula: "% Tempo Distribuição = (Incidentes resolvidos no prazo por grupo / Total por grupo) × 100",
  };
}

/**
 * Utilização da Gestão do Conhecimento
 * Fórmula: % Participação = (Incidentes fechados com artigo vinculado / Total Resolvidos) × 100
 */
function calcKnowledgeManagementUsage(tickets, options = {}) {
  let withArticle = 0;
  let totalResolved = 0;
  
  tickets.forEach(ticket => {
    const resolvedAtStr = ticket.resolved_at || ticket.stats?.resolved_at || ticket.closed_at || ticket.stats?.closed_at;
    if (!resolvedAtStr) return;
    
    totalResolved += 1;
    
    // Verificar se tem artigo de conhecimento vinculado
    if (ticket.article_id || ticket.solution_article_id || ticket.custom_fields?.cf_knowledge_article) {
      withArticle += 1;
    }
  });
  
  const rate = totalResolved > 0 ? (withArticle / totalResolved) * 100 : 0;
  
  return {
    rate: Math.round(rate * 100) / 100,
    withArticle,
    totalResolved,
    formula: "% Participação = (Incidentes fechados com artigo vinculado / Total Resolvidos) × 100",
  };
}

/**
 * Custo Unitário
 * Fórmula: Custo Unitário = Custo Total por Touchpoint / Total de contatos por touchpoint
 */
function calcUnitCost(costData = {}, contactsData = {}) {
  const { 
    totalCost = 0,
    costByTouchpoint = { phone: 0, email: 0, chat: 0, portal: 0 }
  } = costData;
  
  const { 
    totalContacts = 0,
    byTouchpoint = { phone: 0, email: 0, chat: 0, portal: 0 }
  } = contactsData;
  
  const value = totalContacts > 0 ? totalCost / totalContacts : 0;
  
  const unitCostByTouchpoint = {};
  for (const touchpoint of ['phone', 'email', 'chat', 'portal']) {
    const cost = costByTouchpoint[touchpoint] || 0;
    const contacts = byTouchpoint[touchpoint] || 0;
    unitCostByTouchpoint[touchpoint] = contacts > 0 ? Math.round((cost / contacts) * 100) / 100 : 0;
  }
  
  return {
    value: Math.round(value * 100) / 100,
    totalCost,
    totalContacts,
    byTouchpoint: unitCostByTouchpoint,
    formula: "Custo Unitário = Custo Total por Touchpoint / Total de contatos por touchpoint",
  };
}

/**
 * Índice de Qualidade
 * Fórmula: % Índice Qualidade = (1 - (∑ Pontos Encontrados / ∑ Pontos Possíveis)) × 100
 */
function calcQualityIndex(qualityData = {}) {
  const { 
    pointsFound = 0, 
    possiblePoints = 0,
    byType = { tickets: 0, calls: 0, articles: 0 }
  } = qualityData;
  
  const rate = possiblePoints > 0 ? (1 - (pointsFound / possiblePoints)) * 100 : 0;
  
  return {
    rate: Math.round(rate * 100) / 100,
    pointsFound,
    possiblePoints,
    byType,
    formula: "% Índice Qualidade = (1 - (∑ Pontos Encontrados / ∑ Pontos Possíveis)) × 100",
  };
}

// ============================================================================
// FUNÇÃO AGREGADORA: CALCULA TODAS AS MÉTRICAS HDI-SCC
// ============================================================================

function calcAllHdiSccMetrics(tickets, calls = [], groups = [], options = {}) {
  const { startDate, endDate } = options;
  const dateOptions = { startDate, endDate };
  
  // Calcular métricas de desempenho baseadas em tickets reais
  const contactsReceived = calcContactsReceived(tickets, { totalCalls: calls.length });
  
  return {
    peopleExperience: {
      enps: null,
      nps: null,
      lnps: null,
      turnover: null,
      absenteeism: null,
      staffUtilization: null,
    },
    customerExperience: {
      csat: calcCSAT(tickets, dateOptions),
    },
    performanceResults: {
      registeredTickets: calcRegisteredTickets(tickets, { totalContacts: contactsReceived.total }),
      contactsReceived,
      selfServiceEffectiveness: null,
      averageResponseTime: calcAverageResponseTime(tickets, dateOptions),
      abandonmentRate: calcAbandonmentRate(calls, dateOptions),
      telephonySummary: calcCallSummary(calls, dateOptions),
      resolutionTime: calcResolutionTime(tickets, dateOptions),
      fcr: calcFCR(tickets, dateOptions),
      flr: calcFLR(tickets, dateOptions),
      reopenedRate: calcReopenedRate(tickets, dateOptions),
      backlog: calcBacklog(tickets, dateOptions),
      hierarchicalEscalation: calcHierarchicalEscalation(tickets, dateOptions),
      internalFunctionalEscalation: calcInternalFunctionalEscalation(tickets, dateOptions),
      externalFunctionalEscalation: calcExternalFunctionalEscalation(tickets, dateOptions),
      resolutionTimeDistribution: calcResolutionTimeDistribution(tickets, groups, dateOptions),
      knowledgeManagementUsage: calcKnowledgeManagementUsage(tickets, dateOptions),
      unitCost: null, // requer dados financeiros externos não disponíveis na API
      qualityIndex: null, // requer programa de QA externo
    },
    period: {
      startDate: startDate || '',
      endDate: endDate || '',
    },
    lastUpdated: new Date().toISOString(),
  };
}

module.exports = {
  calcENPS,
  calcTurnover,
  calcAbsenteeism,
  calcStaffUtilization,
  calcCustomerNPS,
  calcCSAT,
  calcFeedbackReturnRate,
  calcRegisteredTickets,
  calcContactsReceived,
  calcAverageResponseTime,
  calcAbandonmentRate,
  calcResolutionTime,
  calcFCR,
  calcFLR,
  calcReopenedRate,
  calcBacklog,
  calcHierarchicalEscalation,
  calcInternalFunctionalEscalation,
  calcExternalFunctionalEscalation,
  calcResolutionTimeDistribution,
  calcKnowledgeManagementUsage,
  calcUnitCost,
  calcQualityIndex,
  calcCallSummary,
  calcAllHdiSccMetrics,
};
