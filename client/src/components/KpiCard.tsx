import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  MinusCircle,
  PhoneCall,
  Ticket,
} from "lucide-react";
import type { Metric } from "@/types/dashboard";

type Status = "success" | "warning" | "critical" | "neutral";

const statusStyles: Record<
  Status,
  {
    badge: string;
    text: string;
    accent: string;
    bar: string;
    icon: React.ComponentType<{ className?: string }>;
    label: string;
  }
> = {
  success: {
    badge: "border-emerald-100 bg-emerald-50 text-emerald-700",
    text: "text-emerald-700",
    accent: "text-emerald-600",
    bar: "from-emerald-400 to-emerald-500",
    icon: CheckCircle2,
    label: "Dentro da meta",
  },
  warning: {
    badge: "border-amber-100 bg-amber-50 text-amber-700",
    text: "text-amber-700",
    accent: "text-amber-600",
    bar: "from-amber-300 to-amber-500",
    icon: AlertTriangle,
    label: "Atenção",
  },
  critical: {
    badge: "border-rose-100 bg-rose-50 text-rose-700",
    text: "text-rose-700",
    accent: "text-rose-600",
    bar: "from-rose-400 to-rose-500",
    icon: AlertTriangle,
    label: "Crítico",
  },
  neutral: {
    badge: "border-slate-200 bg-slate-50 text-slate-600",
    text: "text-slate-600",
    accent: "text-slate-500",
    bar: "from-slate-400 to-slate-500",
    icon: MinusCircle,
    label: "Sem meta",
  },
};

const sourceIcons: Record<Metric["source"], React.ComponentType<{ className?: string }>> = {
  freshservice: Ticket,
  zenvia: PhoneCall,
};

interface KPICardProps {
  metric: Metric;
}

function formatValue(metric: Metric) {
  if (metric.displayValue) {
    return metric.displayValue;
  }

  switch (metric.formatter) {
    case "percent":
      return `${metric.value.toFixed(1)}%`;
    case "integer":
      return metric.value.toLocaleString("pt-BR");
    case "decimal":
      return metric.value.toFixed(1);
    case "duration":
      return `${metric.value.toFixed(0)} min`;
    default:
      return metric.value.toString();
  }
}

function formatTarget(metric: Metric) {
  if (typeof metric.target !== "number") {
    return null;
  }

  const formatted =
    metric.formatter === "percent"
      ? `${metric.target.toFixed(0)}%`
      : metric.formatter === "duration"
        ? `${metric.target.toFixed(0)} min`
        : metric.target.toLocaleString("pt-BR");

  const label = metric.goalDirection === "below" ? "Limite" : "Meta";

  return `${label}: ${formatted}`;
}

function evaluateStatus(metric: Metric): Status {
  if (typeof metric.target !== "number") {
    return "neutral";
  }

  const goalDirection = metric.goalDirection ?? "above";
  const safeValue =
    metric.value === 0 && goalDirection === "below" ? Number.EPSILON : metric.value;

  const ratio =
    goalDirection === "below"
      ? metric.target / safeValue
      : safeValue / metric.target;

  if (ratio >= 0.9) return "success";
  if (ratio >= 0.7) return "warning";
  return "critical";
}

export default function KPICard({ metric }: KPICardProps) {
  const status = useMemo(() => evaluateStatus(metric), [metric]);
  const targetLabel = formatTarget(metric);
  const Icon = statusStyles[status].icon;
  const SourceIcon = sourceIcons[metric.source];

  // Mock simples de tendência até termos histórico real
  const trendDelta = useMemo(() => 0, []);

  const TrendIcon = trendDelta >= 0 ? ArrowUpRight : ArrowDownRight;
  const trendColor = trendDelta >= 0 ? "text-emerald-400" : "text-rose-400";

  return (
    <motion.article
      initial={{ opacity: 0, y: 18, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      whileHover={{ y: -4, scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/70 transition-transform transition-shadow duration-200 hover:shadow-md hover:border-slate-300"
    >
      <div className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-slate-200 via-white to-slate-200" />
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-slate-400">
            {metric.source === "freshservice" ? "Tickets" : "Telefonia"}
          </p>
          <h3 className="mt-2 text-lg font-semibold text-slate-50">
            {metric.label}
          </h3>
        </div>
        <span className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-slate-500">
          <SourceIcon className="h-5 w-5 text-blue-500" aria-hidden />
        </span>
      </div>

      <div className="mt-6 flex items-end justify-between gap-4">
        <div>
          <p className="text-4xl font-semibold text-slate-900 font-mono tracking-tight">
            {formatValue(metric)}
          </p>
          {/* Barra de progresso em relação à meta */}
          {typeof metric.target === "number" && (
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full w-full bg-gradient-to-r ${statusStyles[status].bar}`}
                style={{
                  // valor relativo à meta, clamp entre 0 e 1
                  transformOrigin: "left",
                  transform: `scaleX(${Math.max(
                    0,
                    Math.min(
                      1,
                      metric.goalDirection === "below"
                        ? metric.target / Math.max(metric.value || 1, 1)
                        : metric.value / Math.max(metric.target || 1, 1),
                    ),
                  )})`,
                }}
              />
            </div>
          )}
          {metric.description && (
            <p className="mt-1 text-xs text-slate-400">{metric.description}</p>
          )}
        </div>
        {metric.target && (
          <span
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${statusStyles[status].badge}`}
          >
            <Icon className="h-4 w-4" aria-hidden />
            {statusStyles[status].label}
          </span>
        )}
      </div>

      <div className="mt-5 flex items-center justify-between text-xs text-slate-400">
        {targetLabel ? (
          <span className={`font-semibold ${statusStyles[status].text}`}>{targetLabel}</span>
        ) : (
          <span>&nbsp;</span>
        )}
        <div className="flex items-center gap-2 rounded-full bg-slate-900/70 px-3 py-1 text-[0.7rem] font-medium text-slate-300 border border-slate-700/60">
          <TrendIcon className={`h-3.5 w-3.5 ${trendColor}`} aria-hidden />
          <span>
            {trendDelta === 0
              ? "Sem comparação"
              : `${Math.abs(trendDelta).toFixed(1)}% vs período anterior`}
          </span>
        </div>
      </div>
    </motion.article>
  );
}

