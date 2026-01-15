import type { DateRange } from "@/types/dashboard";

export type PeriodKey = "week" | "month" | "quarter";

export interface TicketBucket {
  id: string;
  date: string; // YYYY-MM-DD
  analyst: string;
  group: "Suporte" | "Field" | "NOC" | "Delivery";
  status: "resolved" | "pending" | "sla_breach";
  priority: "Baixa" | "Média" | "Alta" | "Urgente";
  urgency: "Baixa" | "Média" | "Alta" | "Urgente";
  slaMet: boolean;
  firstResponseMinutes: number;
  firstResponseMet: boolean;
  resolutionMinutes: number;
  reopened: number;
  csatScore?: number;
  count: number;
}

export interface CallBucket {
  id: string;
  date: string;
  analyst: string;
  durationMinutes: number;
  abandoned: boolean;
  count: number;
}

export interface PeriodDataset {
  label: string;
  overview: string;
  summary: string;
  lastUpdate: string;
  notes: string[];
  defaultDateRange: DateRange;
  backlogBase: number;
  tickets: TicketBucket[];
  calls: CallBucket[];
}

export const periodOptions: Array<{ id: PeriodKey; label: string }> = [
  { id: "week", label: "Semana" },
  { id: "month", label: "Mês" },
  { id: "quarter", label: "Trimestre" },
];

const weekTickets: TicketBucket[] = [
  {
    id: "wk-1",
    date: "2025-11-11",
    analyst: "Marcelo Gomes",
    group: "Suporte",
    status: "resolved",
    priority: "Média",
    urgency: "Média",
    slaMet: true,
    firstResponseMinutes: 11,
    firstResponseMet: true,
    resolutionMinutes: 128,
    reopened: 2,
    csatScore: 84,
    count: 38,
  },
  {
    id: "wk-2",
    date: "2025-11-12",
    analyst: "Gabriel Foletto",
    group: "Suporte",
    status: "resolved",
    priority: "Alta",
    urgency: "Alta",
    slaMet: true,
    firstResponseMinutes: 9,
    firstResponseMet: true,
    resolutionMinutes: 115,
    reopened: 1,
    csatScore: 81,
    count: 36,
  },
  {
    id: "wk-3",
    date: "2025-11-13",
    analyst: "Guilherme Leal",
    group: "Field",
    status: "sla_breach",
    priority: "Alta",
    urgency: "Urgente",
    slaMet: false,
    firstResponseMinutes: 22,
    firstResponseMet: false,
    resolutionMinutes: 210,
    reopened: 3,
    csatScore: 65,
    count: 28,
  },
  {
    id: "wk-4",
    date: "2025-11-14",
    analyst: "Letícia Santos",
    group: "NOC",
    status: "resolved",
    priority: "Média",
    urgency: "Média",
    slaMet: true,
    firstResponseMinutes: 12,
    firstResponseMet: true,
    resolutionMinutes: 95,
    reopened: 1,
    csatScore: 88,
    count: 32,
  },
  {
    id: "wk-5",
    date: "2025-11-15",
    analyst: "Edgar Matos",
    group: "Delivery",
    status: "pending",
    priority: "Alta",
    urgency: "Alta",
    slaMet: false,
    firstResponseMinutes: 18,
    firstResponseMet: false,
    resolutionMinutes: 0,
    reopened: 0,
    count: 24,
  },
  {
    id: "wk-6",
    date: "2025-11-16",
    analyst: "Marcelo Gomes",
    group: "Suporte",
    status: "resolved",
    priority: "Baixa",
    urgency: "Baixa",
    slaMet: true,
    firstResponseMinutes: 8,
    firstResponseMet: true,
    resolutionMinutes: 70,
    reopened: 0,
    csatScore: 90,
    count: 16,
  },
  {
    id: "wk-7",
    date: "2025-11-17",
    analyst: "Gabriel Foletto",
    group: "Suporte",
    status: "resolved",
    priority: "Urgente",
    urgency: "Urgente",
    slaMet: true,
    firstResponseMinutes: 7,
    firstResponseMet: true,
    resolutionMinutes: 82,
    reopened: 1,
    csatScore: 79,
    count: 40,
  },
];

const weekCalls: CallBucket[] = [
  { id: "wc-1", date: "2025-11-11", analyst: "Marcelo Gomes", durationMinutes: 6, abandoned: false, count: 150 },
  { id: "wc-2", date: "2025-11-12", analyst: "Gabriel Foletto", durationMinutes: 7, abandoned: false, count: 142 },
  { id: "wc-3", date: "2025-11-13", analyst: "Guilherme Leal", durationMinutes: 9, abandoned: true, count: 110 },
  { id: "wc-4", date: "2025-11-14", analyst: "Letícia Santos", durationMinutes: 8, abandoned: false, count: 130 },
  { id: "wc-5", date: "2025-11-15", analyst: "Edgar Matos", durationMinutes: 5, abandoned: true, count: 80 },
];

const monthTickets: TicketBucket[] = [
  {
    id: "mo-1",
    date: "2025-10-02",
    analyst: "Marcelo Gomes",
    group: "Suporte",
    status: "resolved",
    priority: "Média",
    urgency: "Média",
    slaMet: true,
    firstResponseMinutes: 13,
    firstResponseMet: true,
    resolutionMinutes: 180,
    reopened: 6,
    csatScore: 78,
    count: 320,
  },
  {
    id: "mo-2",
    date: "2025-10-06",
    analyst: "Gabriel Foletto",
    group: "Suporte",
    status: "resolved",
    priority: "Alta",
    urgency: "Alta",
    slaMet: true,
    firstResponseMinutes: 15,
    firstResponseMet: true,
    resolutionMinutes: 195,
    reopened: 5,
    csatScore: 75,
    count: 310,
  },
  {
    id: "mo-3",
    date: "2025-10-10",
    analyst: "Guilherme Leal",
    group: "Field",
    status: "sla_breach",
    priority: "Urgente",
    urgency: "Urgente",
    slaMet: false,
    firstResponseMinutes: 24,
    firstResponseMet: false,
    resolutionMinutes: 310,
    reopened: 12,
    csatScore: 61,
    count: 280,
  },
  {
    id: "mo-4",
    date: "2025-10-14",
    analyst: "Letícia Santos",
    group: "NOC",
    status: "resolved",
    priority: "Média",
    urgency: "Média",
    slaMet: true,
    firstResponseMinutes: 16,
    firstResponseMet: false,
    resolutionMinutes: 170,
    reopened: 4,
    csatScore: 86,
    count: 260,
  },
  {
    id: "mo-5",
    date: "2025-10-18",
    analyst: "Edgar Matos",
    group: "Delivery",
    status: "pending",
    priority: "Alta",
    urgency: "Alta",
    slaMet: false,
    firstResponseMinutes: 20,
    firstResponseMet: false,
    resolutionMinutes: 0,
    reopened: 0,
    count: 240,
  },
  {
    id: "mo-6",
    date: "2025-10-22",
    analyst: "Marcelo Gomes",
    group: "Suporte",
    status: "resolved",
    priority: "Baixa",
    urgency: "Baixa",
    slaMet: true,
    firstResponseMinutes: 10,
    firstResponseMet: true,
    resolutionMinutes: 140,
    reopened: 3,
    csatScore: 82,
    count: 220,
  },
  {
    id: "mo-7",
    date: "2025-10-26",
    analyst: "Sofia Andrade",
    group: "Field",
    status: "resolved",
    priority: "Alta",
    urgency: "Alta",
    slaMet: true,
    firstResponseMinutes: 14,
    firstResponseMet: true,
    resolutionMinutes: 165,
    reopened: 2,
    csatScore: 88,
    count: 210,
  },
  {
    id: "mo-8",
    date: "2025-10-30",
    analyst: "Gabriel Foletto",
    group: "Suporte",
    status: "sla_breach",
    priority: "Urgente",
    urgency: "Urgente",
    slaMet: false,
    firstResponseMinutes: 23,
    firstResponseMet: false,
    resolutionMinutes: 240,
    reopened: 7,
    csatScore: 68,
    count: 142,
  },
];

const monthCalls: CallBucket[] = [
  { id: "mc-1", date: "2025-10-03", analyst: "Marcelo Gomes", durationMinutes: 8, abandoned: false, count: 620 },
  { id: "mc-2", date: "2025-10-07", analyst: "Gabriel Foletto", durationMinutes: 9, abandoned: false, count: 610 },
  { id: "mc-3", date: "2025-10-12", analyst: "Guilherme Leal", durationMinutes: 11, abandoned: true, count: 580 },
  { id: "mc-4", date: "2025-10-16", analyst: "Letícia Santos", durationMinutes: 10, abandoned: false, count: 560 },
  { id: "mc-5", date: "2025-10-20", analyst: "Edgar Matos", durationMinutes: 7, abandoned: true, count: 500 },
  { id: "mc-6", date: "2025-10-24", analyst: "Sofia Andrade", durationMinutes: 6, abandoned: false, count: 340 },
];

const quarterTickets: TicketBucket[] = [
  {
    id: "qt-1",
    date: "2025-08-05",
    analyst: "Marcelo Gomes",
    group: "Suporte",
    status: "resolved",
    priority: "Média",
    urgency: "Média",
    slaMet: true,
    firstResponseMinutes: 14,
    firstResponseMet: true,
    resolutionMinutes: 200,
    reopened: 5,
    csatScore: 74,
    count: 140,
  },
  {
    id: "qt-2",
    date: "2025-08-18",
    analyst: "Gabriel Foletto",
    group: "Suporte",
    status: "resolved",
    priority: "Alta",
    urgency: "Alta",
    slaMet: true,
    firstResponseMinutes: 16,
    firstResponseMet: false,
    resolutionMinutes: 215,
    reopened: 6,
    csatScore: 72,
    count: 120,
  },
  {
    id: "qt-3",
    date: "2025-09-04",
    analyst: "Guilherme Leal",
    group: "Field",
    status: "sla_breach",
    priority: "Urgente",
    urgency: "Urgente",
    slaMet: false,
    firstResponseMinutes: 26,
    firstResponseMet: false,
    resolutionMinutes: 330,
    reopened: 10,
    csatScore: 58,
    count: 110,
  },
  {
    id: "qt-4",
    date: "2025-09-19",
    analyst: "Letícia Santos",
    group: "NOC",
    status: "resolved",
    priority: "Média",
    urgency: "Média",
    slaMet: true,
    firstResponseMinutes: 15,
    firstResponseMet: true,
    resolutionMinutes: 185,
    reopened: 3,
    csatScore: 90,
    count: 100,
  },
  {
    id: "qt-5",
    date: "2025-10-03",
    analyst: "Edgar Matos",
    group: "Delivery",
    status: "pending",
    priority: "Alta",
    urgency: "Alta",
    slaMet: false,
    firstResponseMinutes: 19,
    firstResponseMet: false,
    resolutionMinutes: 0,
    reopened: 0,
    count: 90,
  },
  {
    id: "qt-6",
    date: "2025-10-20",
    analyst: "Sofia Andrade",
    group: "Field",
    status: "resolved",
    priority: "Baixa",
    urgency: "Baixa",
    slaMet: true,
    firstResponseMinutes: 12,
    firstResponseMet: true,
    resolutionMinutes: 160,
    reopened: 2,
    csatScore: 88,
    count: 70,
  },
  {
    id: "qt-7",
    date: "2025-11-05",
    analyst: "Gabriel Foletto",
    group: "Suporte",
    status: "sla_breach",
    priority: "Urgente",
    urgency: "Urgente",
    slaMet: false,
    firstResponseMinutes: 24,
    firstResponseMet: false,
    resolutionMinutes: 240,
    reopened: 5,
    csatScore: 60,
    count: 67,
  },
];

const quarterCalls: CallBucket[] = [
  { id: "qc-1", date: "2025-08-07", analyst: "Marcelo Gomes", durationMinutes: 9, abandoned: false, count: 720 },
  { id: "qc-2", date: "2025-08-21", analyst: "Gabriel Foletto", durationMinutes: 10, abandoned: false, count: 690 },
  { id: "qc-3", date: "2025-09-08", analyst: "Guilherme Leal", durationMinutes: 12, abandoned: true, count: 660 },
  { id: "qc-4", date: "2025-09-25", analyst: "Letícia Santos", durationMinutes: 11, abandoned: false, count: 640 },
  { id: "qc-5", date: "2025-10-11", analyst: "Edgar Matos", durationMinutes: 8, abandoned: true, count: 630 },
  { id: "qc-6", date: "2025-10-28", analyst: "Sofia Andrade", durationMinutes: 7, abandoned: false, count: 656 },
];

export const periodData: Record<PeriodKey, PeriodDataset> = {
  week: {
    label: "Semana Atual",
    overview:
      "Tendência semanal acompanhando o volume diário de tickets e ligações para ajustes táticos rápidos.",
    summary: "Impacto controlado durante a semana, com leve atenção ao SLA de resolução.",
    lastUpdate: "2025-11-17T08:45:00-03:00",
    notes: [
      "Volume concentrado entre terça e quinta; planejar reforço nesses dias.",
      "SLA de primeiro atendimento manteve 98%, dentro do limite.",
      "TMA acima do objetivo sinaliza necessidade de scripts mais curtos.",
    ],
    defaultDateRange: { start: "2025-11-11", end: "2025-11-17" },
    backlogBase: 42,
    tickets: weekTickets,
    calls: weekCalls,
  },
  month: {
    label: "Último Mês",
    overview:
      "Consolidação mensal combinando Freshservice + Zenvia para revisão estratégica.",
    summary: "Comportamento estável, porém CSAT e TMA exigem plano de ação.",
    lastUpdate: "2025-10-31T18:12:00-03:00",
    notes: [
      "Backlog controlado graças ao squad Field trabalhando em pares.",
      "Taxa de reabertura caiu 2 p.p. com o novo checklist.",
      "Necessário reforço no treinamento de scripts para reduzir TMA.",
    ],
    defaultDateRange: { start: "2025-10-01", end: "2025-10-31" },
    backlogBase: 137,
    tickets: monthTickets,
    calls: monthCalls,
  },
  quarter: {
    label: "Último Trimestre",
    overview:
      "Integra Freshservice (tickets) e Zenvia (telefonia) para oferecer visão única da operação.",
    summary:
      "KPIs principais estáveis, porém CSAT e SLA de resolução seguem abaixo da curva desejada.",
    lastUpdate: "2025-11-15T09:34:00-03:00",
    notes: [
      "CSAT e SLA de resolução permanecem em vermelho e exigem ação imediata.",
      "SLA de primeiro atendimento e taxa de abandono seguem saudáveis.",
      "TMA acima do limite indica revisão de processos e automações.",
    ],
    defaultDateRange: { start: "2025-08-01", end: "2025-11-11" },
    backlogBase: 13,
    tickets: quarterTickets,
    calls: quarterCalls,
  },
};

const analystSet = new Set<string>();
Object.values(periodData).forEach(period => {
  period.tickets.forEach(ticket => analystSet.add(ticket.analyst));
  period.calls.forEach(call => analystSet.add(call.analyst));
});

export const analystOptions = Array.from(analystSet).sort();


