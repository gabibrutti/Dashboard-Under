import { motion } from "framer-motion";
import { ReactNode, useId } from "react";
import {
  Bar,
  BarChart,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent";
import type { TooltipProps } from "recharts";

export type SimpleDatum = {
  name: string;
  value: number;
  color?: string;
};

const fadeInMotion = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.45, ease: "easeOut" },
};

export interface ChartCardProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
}

export function ChartCard({ title, subtitle, action, children }: ChartCardProps) {
  return (
    <motion.section
      className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/70"
      whileHover={{ y: -3, scale: 1.01 }}
      {...fadeInMotion}
    >
      <header className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
            {subtitle}
          </p>
          <h3 className="mt-1 text-lg font-semibold text-slate-900">{title}</h3>
        </div>
        {action}
      </header>
      <div className="h-56">{children}</div>
    </motion.section>
  );
}

export function GlassTooltip({
  active,
  payload,
  label,
}: TooltipProps<ValueType, NameType>) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-2xl border border-white/40 bg-white/20 px-4 py-3 text-sm text-slate-900 shadow-2xl backdrop-blur-xl">
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-600">
        {label}
      </p>
      <ul className="mt-2 space-y-1">
        {payload.map(item => (
          <li key={`tooltip-${item.name ?? item.dataKey}`} className="flex items-center justify-between gap-6">
            <span className="flex items-center gap-2 text-slate-600">
              {item.color && (
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
              )}
              {item.name ?? item.dataKey}
            </span>
            <span className="font-semibold text-slate-900">
              {typeof item.value === "number"
                ? item.value.toLocaleString("pt-BR")
                : item.value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function TrendLineChart({
  data,
  dataKey = "tickets",
  stroke = "#2563eb",
}: {
  data: Record<string, number | string>[];
  dataKey?: string;
  stroke?: string;
}) {
  const gradientId = useId();

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity={0.9} />
            <stop offset="100%" stopColor={stroke} stopOpacity={0.1} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="name"
          axisLine={false}
          tickLine={false}
          tick={{ fill: "#94a3b8", fontSize: 12 }}
        />
        <YAxis hide />
        <Tooltip content={<GlassTooltip />} cursor={{ stroke: stroke, strokeWidth: 1, strokeOpacity: 0.2 }} />
        <Line
          type="monotone"
          dataKey={dataKey}
          stroke={`url(#${gradientId})`}
          strokeWidth={3}
          dot={{ r: 4, fill: stroke, strokeWidth: 2, stroke: "#fff" }}
          activeDot={{ r: 6, fill: stroke }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function DistributionBarChart({ data }: { data: SimpleDatum[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 12, right: 0, left: -16, bottom: 0 }}>
        <XAxis
          dataKey="name"
          axisLine={false}
          tickLine={false}
          tick={{ fill: "#94a3b8", fontSize: 12 }}
        />
        <YAxis hide />
        <Tooltip content={<GlassTooltip />} cursor={{ fill: "rgba(15, 23, 42, 0.05)" }} />
        <Bar dataKey="value" radius={[12, 12, 4, 4]}>
          {data.map(item => (
            <Cell key={item.name} fill={item.color ?? "#2563eb"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function PriorityDonutChart({ data }: { data: SimpleDatum[] }) {
  const gradientId = useId();

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <defs>
          <linearGradient id={gradientId} x1="1" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1d4ed8" stopOpacity={1} />
            <stop offset="100%" stopColor="#22d3ee" stopOpacity={0.9} />
          </linearGradient>
        </defs>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius="65%"
          outerRadius="90%"
          paddingAngle={3}
          stroke="#fff"
          strokeWidth={2}
        >
          {data.map(item => (
            <Cell key={item.name} fill={item.color ?? `url(#${gradientId})`} />
          ))}
        </Pie>
        <Tooltip content={<GlassTooltip />} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function SlaByGroupChart({ data }: { data: SimpleDatum[] }) {
  const gradientId = useId();

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 12, right: 10, left: -12, bottom: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#34d399" />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="name"
          axisLine={false}
          tickLine={false}
          tick={{ fill: "#94a3b8", fontSize: 12 }}
        />
        <YAxis hide domain={[0, 100]} />
        <Tooltip content={<GlassTooltip />} cursor={{ fill: "rgba(16, 185, 129, 0.1)" }} />
        <Bar dataKey="value" fill={`url(#${gradientId})`} radius={[12, 12, 4, 4]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function VolumeByGroupChart({ data }: { data: SimpleDatum[] }) {
  const gradientId = useId();

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#eab308" />
            <stop offset="100%" stopColor="#f97316" />
          </linearGradient>
        </defs>
        <XAxis type="number" hide />
        <YAxis
          dataKey="name"
          type="category"
          axisLine={false}
          tickLine={false}
          tick={{ fill: "#94a3b8", fontSize: 12 }}
        />
        <Tooltip content={<GlassTooltip />} cursor={{ fill: "rgba(234, 179, 8, 0.1)" }} />
        <Bar dataKey="value" fill={`url(#${gradientId})`} radius={[0, 12, 12, 0]} barSize={28} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function TopAnalystsChart({ data }: { data: SimpleDatum[] }) {
  const gradientId = useId();

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#a855f7" />
          </linearGradient>
        </defs>
        <XAxis type="number" hide />
        <YAxis
          dataKey="name"
          type="category"
          width={100}
          axisLine={false}
          tickLine={false}
          tick={{ fill: "#475569", fontSize: 12 }}
        />
        <Tooltip content={<GlassTooltip />} cursor={{ fill: "rgba(99, 102, 241, 0.08)" }} />
        <Bar dataKey="value" barSize={18} radius={[0, 12, 12, 0]} fill={`url(#${gradientId})`} />
      </BarChart>
    </ResponsiveContainer>
  );
}


