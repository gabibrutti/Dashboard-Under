const fetch = require("node-fetch");

function buildAuthHeader(apiKey) {
  return "Basic " + Buffer.from(apiKey + ":X").toString("base64");
}

function buildDefaultHeaders(apiKey) {
  return {
    Authorization: buildAuthHeader(apiKey),
    Accept: "application/json",
    "Content-Type": "application/json",
  };
}

async function getGroups(apiKey, domain) {
  const apiKeyToUse = apiKey || process.env.FRESHSERVICE_API_KEY;
  const domainToUse = domain || process.env.FRESHSERVICE_DOMAIN || "https://under.freshservice.com";
  const API_BASE = `${domainToUse}/api/v2`;
  
  if (!apiKeyToUse) {
    throw new Error("FRESHSERVICE_API_KEY não configurada");
  }

  const defaultHeaders = buildDefaultHeaders(apiKeyToUse);
  const allGroups = [];
  let page = 1;

  while (true) {
    const url = `${API_BASE}/groups?per_page=100&page=${page}`;
    console.log("[Freshservice] GET groups:", url);
    const res = await fetch(url, { headers: defaultHeaders });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Erro ao buscar grupos do Freshservice: ${res.status} - ${text}`);
    }

    const data = await res.json();
    const batch = data.groups ?? data;

    if (!batch.length) break;

    allGroups.push(...batch);
    page += 1;

    // Se retornou menos que 100, é a última página
    if (batch.length < 100) break;
  }

  // Retornar array simplificado
  return allGroups.map(g => ({
    id: g.id,
    name: g.name,
  }));
}

async function getAgents(groupId, apiKey, domain) {
  const apiKeyToUse = apiKey || process.env.FRESHSERVICE_API_KEY;
  const domainToUse = domain || process.env.FRESHSERVICE_DOMAIN || "https://under.freshservice.com";
  const API_BASE = `${domainToUse}/api/v2`;
  
  if (!apiKeyToUse) {
    throw new Error("FRESHSERVICE_API_KEY não configurada");
  }

  const defaultHeaders = buildDefaultHeaders(apiKeyToUse);
  const allAgents = [];
  let page = 1;

  while (true) {
    const url = `${API_BASE}/agents?per_page=100&page=${page}`;
    console.log("[Freshservice] GET agents:", url);
    const res = await fetch(url, { headers: defaultHeaders });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Erro ao buscar agentes do Freshservice: ${res.status} - ${text}`);
    }

    const data = await res.json();
    const batch = data.agents ?? data;

    if (!batch.length) break;

    allAgents.push(...batch);
    page += 1;

    if (batch.length < 100) break;
  }

  // Filtrar apenas agentes ativos
  let filtered = allAgents.filter(a => a.active === true);

  // Filtrar por grupo se informado
  if (groupId) {
    const gid = Number(groupId);
    filtered = filtered.filter(a => {
      if (a.primary_group_id === gid) return true;
      if (Array.isArray(a.group_ids) && a.group_ids.includes(gid)) return true;
      return false;
    });
  }

  // Retornar estrutura simplificada
  return filtered.map(a => ({
    id: a.id,
    name: a.display_name || `${a.first_name || ""} ${a.last_name || ""}`.trim() || a.email,
    email: a.email,
    primary_group_id: a.primary_group_id,
    group_ids: a.group_ids || [],
  }));
}

async function getTickets({ startDate, endDate, groupId, agentId }, apiKey, domain) {
  const apiKeyToUse = apiKey || process.env.FRESHSERVICE_API_KEY;
  const domainToUse = domain || process.env.FRESHSERVICE_DOMAIN || "https://under.freshservice.com";
  const API_BASE = `${domainToUse}/api/v2`;
  
  if (!apiKeyToUse) {
    throw new Error("FRESHSERVICE_API_KEY não configurada");
  }

  const defaultHeaders = buildDefaultHeaders(apiKeyToUse);
  const allTickets = [];
  let page = 1;

  // Preparar janela de dados baseada em startDate (ou últimos 30 dias se não houver)
  const gid = groupId ? Number(groupId) : null;
  const aid = agentId ? Number(agentId) : null;
  const start = startDate ? new Date(startDate + "T00:00:00") : null;
  const end = endDate ? new Date(endDate + "T23:59:59") : null;
  const fallbackSince = new Date();
  fallbackSince.setDate(fallbackSince.getDate() - 30);

  while (true) {
    // Usar updated_since baseado no início do período quando existir; caso contrário, últimos 30 dias
    const baseDate = start || fallbackSince;
    const baseIso = baseDate.toISOString().split("T")[0];
    const updatedSinceParam = `&updated_since=${encodeURIComponent(baseIso + "T00:00:00Z")}`;

    // Atenção: o endpoint /tickets não aceita group_id direto na query
    // (retorna 400 invalid_field). Mantemos o filtro de grupo apenas em memória
    // mais abaixo, usando ticket.group_id === gid.

    const url = `${API_BASE}/tickets?per_page=100&page=${page}&include=stats${updatedSinceParam}`;
    console.log("[Freshservice] GET tickets:", url);
    const res = await fetch(url, { headers: defaultHeaders });

    if (!res.ok) {
      const text = await res.text();
      // Se for rate limit, retornar o que já temos em vez de falhar
      if (res.status === 429 || res.status === 420) {
        console.warn(`[Freshservice] Rate limit atingido na página ${page}. Retornando ${allTickets.length} tickets já carregados.`);
        break;
      }
      throw new Error(`Erro ao buscar tickets do Freshservice: ${res.status} - ${text}`);
    }

    const data = await res.json();
    const batch = data.tickets ?? data;

    if (!batch.length) break;

    allTickets.push(...batch);

    page += 1;

    // Se retornou menos que 100, é a última página
    if (batch.length < 100) break;

    // Pequeno delay para evitar estourar rate limit em loops longos
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  // Aplicar filtros em memória apenas por grupo/agente.
  // O recorte de período (startDate/endDate) será tratado no frontend
  // usando created_at, resolved_at e outros campos de data.
  let filtered = allTickets.filter(ticket => {
    // Filtro de grupo: usar o group_id atual do ticket
    if (gid && ticket.group_id !== gid) {
      return false;
    }

    // Filtro de agente explícito (se for usado em outras telas)
    if (aid && ticket.responder_id !== aid) return false;

    return true;
  });

  // Retornar tickets completos (sem mapear campos)
  return filtered;
}

module.exports = { getGroups, getAgents, getTickets };
