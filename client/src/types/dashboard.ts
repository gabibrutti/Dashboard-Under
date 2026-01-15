export type MetricFormatter = "integer" | "decimal" | "percent" | "duration";

export type MetricGoalDirection = "above" | "below";

export interface Metric {
  id: string;
  label: string;
  value: number;
  formatter?: MetricFormatter;
  displayValue?: string;
  target?: number;
  goalDirection?: MetricGoalDirection;
  description?: string;
  source: "freshservice" | "zenvia";
}

export interface DateRange {
  start: string;
  end: string;
}

export interface DashboardSnapshot {
  periodLabel: string;
  lastUpdate: string;
  overview: string;
  notes: string[];
  metrics: Metric[];
}

export interface FreshserviceTicket {
  id: number;
  subject: string;
  group_id: number;
  requester_id: number;
  priority: number;
  status: number;
  created_at: string;
  updated_at: string;
  type: string;
}

export interface ZenviaCallRecord {
  id: number;
  data_criacao: string;
  status_geral: string;
  ativa: boolean;
  origem: {
    numero: string;
    tipo: string;
  };
  destino: {
    numero: string;
    tipo: string;
    status: string;
    duracao_segundos: number;
  };
}
 
export interface HdiFcrMetrics {
  rate: number;
  totalEligible: number;
  count: number;
}

export interface HdiFlrMetrics {
  rate: number;
  totalEligible: number;
  count: number;
}

export interface HdiCsatMetrics {
  average: number;
  positiveRate: number;
  total: number;
}

export interface HdiPriorityDistributionItem {
  name: string;
  value: number;
}

export interface HdiSlaDonut {
  within: number;
  breached: number;
}

export interface HdiEscalationGroup {
  groupId: string;
  count: number;
}

// ========== NOVAS INTERFACES HDI AVANÇADAS ==========

export interface HdiBacklogAgeDistribution {
  lessThan24h: number;
  between24hAnd72h: number;
  between72hAnd7d: number;
  moreThan7d: number;
}

export interface HdiBacklogDetailed {
  openTickets: number;
  closedTickets: number;
  netBacklog: number;
  avgAgeHours: number;
  ageDistribution: HdiBacklogAgeDistribution;
}

export interface HdiEfficiency {
  fcrRate: number;
  flrRate: number;
  slaComplianceRate: number;
}

export interface HdiAdvanced {
  backlogDetailed: HdiBacklogDetailed;
  costPerTicket: number;
  efficiency: HdiEfficiency;
}

export interface HdiMaturityCategory {
  id: string;
  label: string;
  score: number;
  hasLevel1: boolean;
  partialScore: boolean;
  breakdown: {
    level1: boolean;
    level2: boolean;
    level3: boolean;
    level4: boolean;
  };
}

export interface HdiMaturityRecommendation {
  category: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  message: string;
}

export interface HdiMaturitySummary {
  totalCategories: number;
  categoriesWithLevel1: number;
  categoriesWithPartialScore: number;
  averageScore: number;
}

export interface HdiMaturity {
  finalScore: number;
  passed: boolean;
  passingScore: number;
  status: 'APROVADO' | 'REPROVADO';
  statusMessage: string;
  categories: HdiMaturityCategory[];
  recommendations: HdiMaturityRecommendation[];
  summary: HdiMaturitySummary;
}

// ========== MÉTRICAS HDI-SCC COMPLETAS ==========

// Experiência de Pessoas
export interface HdiPeopleExperience {
  // eNPS - Satisfação de Pessoas
  enps: {
    score: number;
    promoters: number;
    detractors: number;
    passives: number;
    total: number;
    formula: string;
  };
  // NPS interno
  nps?: number;
  lnps?: number;
  // Turnover
  turnover: {
    rate: number;
    left: number;
    total: number;
    formula: string;
  };
  // Absenteísmo
  absenteeism: {
    rate: number;
    unplannedHours: number;
    plannedHours: number;
    totalAnalysts: number;
    formula: string;
  };
  // Utilização de Pessoal
  staffUtilization: {
    rate: number;
    byTouchpoint: {
      phone: number;
      email: number;
      chat: number;
      portal: number;
    };
    formula: string;
  };
}

// Experiência do Cliente
export interface HdiCustomerExperience {
  // NPS Periódico
  nps: {
    score: number;
    promoters: number;
    detractors: number;
    passives: number;
    total: number;
    formula: string;
  };
  // CSAT Contínuo
  csat: {
    score: number;
    totalResponses: number;
    sumResponses: number;
    formula: string;
  };
}

// Resultados de Desempenho
export interface HdiPerformanceResults {
  // Número de Incidentes/Requisições Registrados
  registeredTickets: {
    rate: number;
    registered: number;
    totalContacts: number;
    byChannel: {
      phone: number;
      email: number;
      chat: number;
      portal: number;
      chatbot: number;
    };
    formula: string;
  };
  // Número de Contatos Recebidos
  contactsReceived: {
    total: number;
    byTouchpoint: {
      phone: number;
      email: number;
      chat: number;
      portal: number;
      chatbot: number;
    };
  };
  // Efetividade do Autoatendimento
  selfServiceEffectiveness: {
    score: number;
    usability: number;
    accessibility: number;
    easeOfUse: number;
    clicksToAnswer: number;
    automationTrainings: number;
    formula: string;
  };
  // Tempo Médio de Resposta (TMR)
  averageResponseTime: {
    overall: number;
    byTouchpoint: {
      incidents: number;
      requests: number;
      phone: number;
      email: number;
      chat: number;
    };
    formula: string;
  };
  // Taxa de Abandono
  abandonmentRate: {
    rate: number;
    abandoned: number;
    received: number;
    byChannel: {
      phone: number;
      chat: number;
      chatbot: number;
    };
    formula: string;
  };
  // Tempo de Resolução de Incidentes
  resolutionTime: {
    rate: number;
    withinSla: number;
    total: number;
    byType: {
      incidents: number;
      requests: number;
    };
    formula: string;
  };
  // FCR - Taxa de Resolução no Primeiro Contato
  fcr: {
    rate: number;
    count: number;
    total: number;
    formula: string;
  };
  // FLR - Taxa de Resolução em Primeiro Nível
  flr: {
    rate: number;
    count: number;
    total: number;
    formula: string;
  };
  // Taxa de Reabertura
  reopenedRate: {
    overall: number;
    byLevel: {
      n1: number;
      n2: number;
      n3: number;
    };
    count: number;
    total: number;
    formula: string;
  };
  // Backlog
  backlog: {
    rate: number;
    overdueOpen: number;
    totalOpen: number;
    ageDistribution: {
      lessThan24h: number;
      between24hAnd72h: number;
      between72hAnd7d: number;
      moreThan7d: number;
    };
    formula: string;
  };
  // Escalação Hierárquica
  hierarchicalEscalation: {
    rate: number;
    escalated: number;
    total: number;
    formula: string;
  };
  // Escalação Funcional para Dentro do Centro de Suporte
  internalFunctionalEscalation: {
    rate: number;
    escalated: number;
    total: number;
    formula: string;
  };
  // Escalação Funcional para Fora do Centro de Suporte
  externalFunctionalEscalation: {
    rate: number;
    escalated: number;
    total: number;
    formula: string;
  };
  // Distribuição dos Tempos de Resolução
  resolutionTimeDistribution: {
    rate: number;
    withinSlaByGroup: number;
    totalByGroup: number;
    byGroup: Record<string, { withinSla: number; total: number; rate: number }>;
    formula: string;
  };
  // Utilização da Gestão do Conhecimento
  knowledgeManagementUsage: {
    rate: number;
    withArticle: number;
    totalResolved: number;
    formula: string;
  };
  // Telefonia (Zenvia)
  telephonySummary?: {
    total: number;
    inbound: number;
    answered: number;
    abandoned: number;
    formula: string;
  } | null;
  // Custo Unitário (opcional/externo)
  unitCost?: {
    value: number;
    totalCost: number;
    totalContacts: number;
    byTouchpoint: {
      phone: number;
      email: number;
      chat: number;
      portal: number;
    };
    formula: string;
  } | null;
  // Índice de Qualidade (opcional/externo)
  qualityIndex?: {
    rate: number;
    pointsFound: number;
    possiblePoints: number;
    byType: {
      tickets: number;
      calls: number;
      articles: number;
    };
    formula?: string;
  } | null;
}

// Interface completa HDI-SCC
export interface HdiSccMetrics {
  peopleExperience: HdiPeopleExperience;
  customerExperience: HdiCustomerExperience;
  performanceResults: HdiPerformanceResults;
  // Metadados
  period: {
    startDate: string;
    endDate: string;
  };
  lastUpdated: string;
}

export interface HdiMetrics {
  totalTickets: number;
  backlog: number;
  reopenedCount: number;
  reopenedRate: number;
  fcr: HdiFcrMetrics;
  flr: HdiFlrMetrics;
  csat: HdiCsatMetrics;
  priorityDistribution: HdiPriorityDistributionItem[];
  slaDonut: HdiSlaDonut;
  topEscalationGroups: HdiEscalationGroup[];
  // Novas métricas HDI
  hdiAdvanced?: HdiAdvanced;
  maturity?: HdiMaturity;
  // Métricas HDI-SCC completas
  hdiScc?: HdiSccMetrics;
}

