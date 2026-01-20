import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Calendar, LayoutDashboard, Clock, CheckCircle, AlertCircle, Filter } from "lucide-react";
import KPICard from "@/components/KpiCard";
import CredentialsConfig from "@/components/CredentialsConfig";
import { useRealDashboardData } from "@/hooks/useRealDashboardData";
import { useMetrics } from "@/hooks/useMetrics";

export default function DashboardOverview() {
  const [credentials, setCredentials] = useState(null);
  const today = new Date().toISOString().split("T")[0];
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [selectedGroup, setSelectedGroup] = useState("37000043862");

  const { isLoading, tickets } = useRealDashboardData(
    { startDate, endDate, groupId: selectedGroup, agentId: "Todos" },
    credentials
  );

  const { metrics, fetchMetrics } = useMetrics({
    startDate, endDate, groupId: selectedGroup, agentId: "Todos", autoFetch: false
  });

  useEffect(() => {
    if (credentials) fetchMetrics();
  }, [credentials, startDate, endDate, selectedGroup]);

  const statsToday = useMemo(() => {
    if (!tickets || !Array.isArray(tickets)) return { opened: 0, resolved: 0, inProgress: 0 };
    const now = new Date().toISOString().split("T")[0];
    return tickets.reduce((acc, t) => {
      const createdDate = t.created_at.split("T")[0];
      const resolvedDate = (t.resolved_at || t.closed_at || "").split("T")[0];
      if (createdDate === now) acc.opened += 1;
      if (resolvedDate === now) acc.resolved += 1;
      if ([2, 3].includes(t.status)) acc.inProgress += 1;
      return acc;
    }, { opened: 0, resolved: 0, inProgress: 0 });
  }, [tickets]);

  return (
    <div className="space-y-8">
      <CredentialsConfig onCredentialsSet={setCredentials} />
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#1e293b]/50 p-6 rounded-2xl border border-white/5 shadow-2xl backdrop-blur-md">
        <div>
          <h1 className="text-2xl font-bold text-white">Visão Geral</h1>
          <p className="text-slate-400 text-sm">Suporte & Delivery • Dados em tempo real</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-[#001831] px-3 py-2 rounded-lg border border-white/10">
            <Filter size={14} className="text-[#20a7df]" />
            <select 
              value={selectedGroup} 
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="bg-transparent border-none text-xs focus:ring-0 cursor-pointer text-white outline-none"
            >
              <option value="37000043862" className="bg-[#001831]">Suporte</option>
              <option value="37000175476" className="bg-[#001831]">Delivery</option>
              <option value="Todos" className="bg-[#001831]">Todos os Grupos</option>
            </select>
          </div>
          <div className="flex items-center gap-2 bg-[#001831] px-3 py-2 rounded-lg border border-white/10">
            <Calendar size={14} className="text-[#20a7df]" />
            <input 
              type="date" 
              value={startDate} 
              onChange={(e) => {setStartDate(e.target.value); setEndDate(e.target.value);}}
              className="bg-transparent border-none text-xs focus:ring-0 text-white outline-none [color-scheme:dark]"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard 
          label="Abertos Hoje" 
          value={statsToday.opened} 
          icon={<AlertCircle size={20} />}
          trend="Novos chamados"
          color="amber"
        />
        <KPICard 
          label="Em Andamento" 
          value={statsToday.inProgress} 
          icon={<Clock size={20} />}
          trend="Aguardando ação"
          color="blue"
        />
        <KPICard 
          label="Resolvidos Hoje" 
          value={statsToday.resolved} 
          icon={<CheckCircle size={20} />}
          trend="Concluídos"
          color="green"
        />
        <KPICard 
          label="SLA Global" 
          value={`${metrics?.slaResolucao || 0}%`} 
          icon={<LayoutDashboard size={20} />}
          trend="Meta: 90%"
          color="blue"
        />
      </div>

      {isLoading && (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-[#20a7df]"></div>
        </div>
      )}

      {!isLoading && tickets.length === 0 && (
        <div className="text-center py-20 bg-[#1e293b]/30 rounded-2xl border border-dashed border-white/10">
          <p className="text-slate-500 text-sm">Nenhum dado encontrado para este período.</p>
        </div>
      )}
    </div>
  );
}
