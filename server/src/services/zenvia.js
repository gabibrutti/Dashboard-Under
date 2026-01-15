const { config } = require('../config.js');
const fetch = require('node-fetch');

/**
 * Verificar se data está dentro do intervalo
 */
function isWithinRange(dateIso, startDate, endDate) {
  if (!dateIso) return false;
  const d = new Date(dateIso).getTime();
  const start = new Date(startDate + 'T00:00:00').getTime();
  const end = new Date(endDate + 'T23:59:59').getTime();
  return d >= start && d <= end;
}

/**
 * Buscar chamadas da API TotalVoice
 * Documentação: https://totalvoice.github.io/totalvoice-docs/
 * URA fixa: 44165 (Central de Serviços HC - Suporte)
 * @param {Object} filters - { startDate, endDate, apiToken, uraId }
 */
async function fetchCalls(filters) {
  const { startDate, endDate, apiToken, uraId, queueName: queueNameFilter } = filters;
  const apiTokenToUse = apiToken || config.zenvia.apiToken || process.env.ZENVIA_API_TOKEN;
  const uraIdToUse = uraId || config.zenvia.uraId || '44165';
  
  if (!apiTokenToUse) {
    throw new Error('ZENVIA_API_TOKEN não configurada');
  }

  console.log(`[Zenvia] Buscando chamadas de ${startDate} até ${endDate}`);
  console.log(`[Zenvia] Token: ${apiTokenToUse.substring(0, 8)}...`);

  let allCalls = [];

  try {
    // Zenvia Voice API - https://voice-app.zenvia.com/doc/
    // Buscar de múltiplos endpoints para obter ligações realizadas E recebidas
    const endpoints = [
      // Relatório de chamadas (ligações realizadas)
      { 
        name: 'chamadas',
        url: `https://voice-app.zenvia.com/chamada/relatorio?data_inicio=${startDate}&data_fim=${endDate}`,
        headers: { 'Access-Token': apiTokenToUse }
      },
      // Relatório de ligações recebidas (entrada)
      { 
        name: 'recebidas',
        url: `https://voice-app.zenvia.com/did/relatorio?data_inicio=${startDate}&data_fim=${endDate}`,
        headers: { 'Access-Token': apiTokenToUse }
      },
      // Fila de atendimento (URA) - ligações recebidas na fila
      { 
        name: 'fila',
        url: `https://voice-app.zenvia.com/fila/${uraIdToUse}/relatorio?data_inicio=${startDate}&data_fim=${endDate}`,
        headers: { 'Access-Token': apiTokenToUse }
      },
    ];

    // Buscar de TODOS os endpoints para combinar resultados
    for (const endpoint of endpoints) {
      try {
        console.log(`[Zenvia] Tentando ${endpoint.name}: ${endpoint.url}`);
        
        const res = await fetch(endpoint.url, {
          method: 'GET',
          headers: {
            ...endpoint.headers,
            'Content-Type': 'application/json',
          },
        });

        console.log(`[Zenvia] ${endpoint.name} Status: ${res.status}`);

        if (res.ok) {
          const data = await res.json();
          console.log(`[Zenvia] ${endpoint.name} Resposta:`, JSON.stringify(data).substring(0, 300));
          
          // Extrair chamadas de diferentes formatos
          let calls = [];
          if (data.dados?.relatorio) calls = data.dados.relatorio;
          else if (data.relatorio) calls = data.relatorio;
          else if (data.dados?.chamadas) calls = data.dados.chamadas;
          else if (data.chamadas) calls = data.chamadas;
          else if (data.calls) calls = data.calls;
          else if (data.data) calls = data.data;
          else if (Array.isArray(data.dados)) calls = data.dados;
          else if (Array.isArray(data)) calls = data;

          if (calls.length > 0) {
            // Marcar a origem das chamadas para identificar recebidas vs realizadas
            const markedCalls = calls.map(c => ({ ...c, _source: endpoint.name }));
            allCalls = [...allCalls, ...markedCalls];
            console.log(`[Zenvia] ${endpoint.name}: ${calls.length} chamadas encontradas`);
          } else {
            console.log(`[Zenvia] ${endpoint.name}: sem chamadas no período`);
          }
        } else {
          const errorText = await res.text();
          console.log(`[Zenvia] ${endpoint.name} Erro ${res.status}: ${errorText.substring(0, 200)}`);
        }
      } catch (err) {
        console.log(`[Zenvia] ${endpoint.name} falhou: ${err.message}`);
      }
    }

    // Remover duplicatas por ID
    const uniqueCalls = [];
    const seenIds = new Set();
    for (const call of allCalls) {
      if (!seenIds.has(call.id)) {
        seenIds.add(call.id);
        uniqueCalls.push(call);
      }
    }
    allCalls = uniqueCalls;

    console.log(`[Zenvia] ${allCalls.length} chamadas únicas encontradas`);
    
    // Debug: mostrar estrutura completa de uma chamada
    if (allCalls.length > 0) {
      console.log(`[Zenvia] Exemplo de chamada COMPLETA:`, JSON.stringify(allCalls[0], null, 2));
    }

    // Mapear para formato padrão (estrutura Zenvia Voice)
    const mappedCalls = allCalls.map((call) => {
      // Estrutura Zenvia Voice:
      // - origem: { tipo: "ramal"|"externo"|"movel"|"fixo", status, duracao_segundos, duracao_falada_segundos }
      // - destino: { tipo: "ramal"|"externo"|"movel"|"fixo", status, duracao_segundos, duracao_falada_segundos }
      // - status_geral: "finalizada", "sem resposta", etc.
      
      const origem = call.origem || {};
      const destino = call.destino || {};
      
      // Duração total - pegar do destino (onde a chamada foi atendida)
      const durationSeconds = Number(destino.duracao_segundos) || Number(origem.duracao_segundos) || 0;
      
      // Tempo de conversa (duracao_falada_segundos) - pegar do destino
      const talkTimeSeconds = Number(destino.duracao_falada_segundos) || Number(origem.duracao_falada_segundos) || 0;
      
      // Status geral e status do destino
      const statusGeral = call.status_geral || 'desconhecido';
      const statusDestino = destino.status || '';
      
      // Determinar direção:
      // - REALIZADA (outbound): origem é ramal e destino é externo/movel/fixo (analista ligou para cliente)
      // - RECEBIDA (inbound): origem é externo/movel/fixo e destino é ramal (cliente ligou para analista)
      //   OU veio do endpoint 'recebidas' ou 'fila'
      let direction = 'outbound'; // Default
      
      // Se veio do endpoint de recebidas ou fila, é uma ligação recebida
      if (call._source === 'recebidas' || call._source === 'fila') {
        direction = 'inbound';
      } else if (origem.tipo === 'ramal' && (destino.tipo === 'movel' || destino.tipo === 'fixo' || destino.tipo === 'externo')) {
        direction = 'outbound'; // Analista ligou para cliente = REALIZADA
      } else if ((origem.tipo === 'movel' || origem.tipo === 'fixo' || origem.tipo === 'externo') && destino.tipo === 'ramal') {
        direction = 'inbound'; // Cliente ligou para analista = RECEBIDA
      } else if (origem.tipo === 'ramal' && destino.tipo === 'ramal') {
        direction = 'internal'; // Ligação interna entre ramais
      }
      
      // Determinar se foi ATENDIDA
      // - status_geral = "finalizada" E (destino.status = "atendida" OU duração > 0)
      const answered = statusGeral === 'finalizada' && 
                      (statusDestino === 'atendida' || durationSeconds > 0 || talkTimeSeconds > 0);
      
      // Determinar se foi ABANDONADA/PERDIDA (não atendida)
      // - status_geral diferente de "finalizada" OU destino.status != "atendida"
      const abandoned = statusGeral === 'sem resposta' || 
                       statusGeral === 'ocupado' || 
                       statusGeral === 'abandonada' ||
                       statusGeral === 'não atendida' ||
                       statusGeral === 'cancelada' ||
                       (statusGeral === 'finalizada' && statusDestino !== 'atendida' && durationSeconds === 0);

      const queueIdRaw =
        call.queue_id ||
        call.fila_id ||
        call.id_fila ||
        call.queueId;
      const queueId = queueIdRaw
        ? String(queueIdRaw)
        : filters.queueId
          ? String(filters.queueId)
          : String(uraIdToUse);
      const queueName =
        call.queue_name ||
        call.fila_nome ||
        call.queueName ||
        queueNameFilter ||
        undefined;

      // Números de origem/destino para filtros adicionais (ex.: DID da fila)
      const destinationNumber =
        call.numero_destino ||
        call.destination_number ||
        destino.numero ||
        '';
      const sourceNumber =
        call.numero_origem ||
        call.origin_number ||
        origem.numero ||
        '';

      const extension =
        destino.tipo === 'ramal'
          ? (destino.numero || destino.ramal || origem.numero || '')
          : origem.tipo === 'ramal'
            ? (origem.numero || origem.ramal || '')
            : destino.numero || origem.numero || '';

      return {
        id: String(call.id || Math.random().toString(36)),
        startedAt: call.data_criacao || destino.data_inicio || origem.data_inicio || '',
        endedAt: destino.data_fim || origem.data_fim || null,
        durationSeconds,
        talkTimeSeconds,
        status: statusGeral,
        statusDestino,
        direction,
        abandoned,
        answered,
        queueId,
        queueName,
        extension,
        ramal: extension,
        destinationNumber,
        sourceNumber,
        // Campos extras para debug
        origem_tipo: origem.tipo,
        destino_tipo: destino.tipo,
        origem_numero: origem.numero,
        destino_numero: destino.numero,
      };
    });

    // Estatísticas rápidas
    const stats = {
      total: mappedCalls.length,
      inbound: mappedCalls.filter(c => c.direction === 'inbound').length,
      outbound: mappedCalls.filter(c => c.direction === 'outbound').length,
      answered: mappedCalls.filter(c => c.answered).length,
      abandoned: mappedCalls.filter(c => c.abandoned).length,
      avgTalkTime: mappedCalls.length > 0 
        ? mappedCalls.reduce((acc, c) => acc + c.talkTimeSeconds, 0) / mappedCalls.length 
        : 0,
    };
    console.log(`[Zenvia] Estatísticas:`, stats);
    
    return mappedCalls;

  } catch (error) {
    console.error('[TotalVoice] Erro ao buscar chamadas:', error.message);
    return [];
  }
}

module.exports = { fetchCalls };
