import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Calendar, Users, TrendingUp, Search, Filter, Trophy, Target, Clock } from "lucide-react";
import { useAnalystMetrics } from "@/hooks/useAnalystMetrics";
import KPICard from "@/components/KpiCard";

export default function TeamPage() {
  const today = new Date().toISOString().split("T")[0];
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [selectedGroup, setSelectedGroup] = useState("37000043862");
  const [groups, setGroups] = useState([]);

  useEffect(() => {
    async function loadGroups() {
      try {
        const res = await fetch("/api/groups");
        if (res.ok) setGroups(await res.json());
      } catch (err) { console.error(err); }
    }
    loadGroups();
  }, []);

  const { data, isLoading, fetchMetrics } = useAnalystMetrics({
    startDate, endDate, groupId: selectedGroup, autoFetch: false,
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#1e293b]/50 p-6 rounded-2xl border border-white/5 shadow-2xl backdrop-blur-md">
        <div>
          <h1 className="text-2xl font-bold text-white">Performance</h1>
          <p className="text-slate-400 text-sm">Ranking e métricas individuais</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-[#001831] px-3 py-2 rounded-lg border border-white/10 hover:border-[#20a7df]/50 transition-colors">
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
          <div className="flex items-center gap-2 bg-[#001831] px-3 py-2 rounded-lg border border-white/10 hover:border-[#20a7df]/50 transition-colors">
            <Calendar size={14} className="text-[#20a7df]" />
            <input 
              type="date" 
              value={startDate} 
              onChange={(e) => {setStartDate(e.target.value); setEndDate(e.target.value);}}
              className="bg-transparent border-none text-xs focus:ring-0 text-white outline-none [color-scheme:dark]"
            />
          </div>
          <button 
            onClick={fetchMetrics}
            className="bg-[#20a7df] hover:bg-[#20a7df]/80 hover:shadow-[0_0_15px_rgba(32,167,223,0.4)] text-white text-xs font-bold px-4 py-2 rounded-lg transition-all active:scale-95"
          >
            Buscar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard 
          label="Total Analistas" 
          value={data?.totalAnalysts || 0} 
          icon={<Users size={20} />}
          color="blue"
        />
        <KPICard 
          label="Tickets Atendidos" 
          value={data?.totalTickets || 0} 
          icon={<Target size={20} />}
          color="green"
        />
        <KPICard 
          label="SLA Médio" 
          value={`${data?.avgSla || 0}%`} 
          icon={<Trophy size={20} />}
          color="blue"
        />
        <KPICard 
          label="Tempo Médio" 
          value={`${data?.avgResolutionTime || 0}m`} 
          icon={<Clock size={20} />}
          color="gray"
        />
      </div>

      {/* Tabela de Performance */}
      <div className="bg-[#1e293b]/30 rounded-2xl border border-white/5 overflow-hidden backdrop-blur-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/5 text-slate-400 uppercase text-[10px] font-bold tracking-widest">
            <tr>
              <th className="px-6 py-4">Analista</th>
              <th className="px-6 py-4 text-center">Resolvidos</th>
              <th className="px-6 py-4 text-center">SLA</th>
              <th className="px-6 py-4 text-center">Tempo Médio</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {data?.analysts?.map((analyst, i) => (
              <tr key={i} className="hover:bg-[#20a7df]/5 transition-all duration-200 group cursor-default">
                <td className="px-6 py-4 font-medium group-hover:text-[#20a7df] transition-colors">{analyst.name}</td>
                <td className="px-6 py-4 text-center group-hover:scale-110 transition-transform">{analyst.resolved}</td>
                <td className="px-6 py-4 text-center">
                  <span className={`px-2 py-1 rounded-full text-[10px] font-bold transition-all ${analyst.sla >= 90 ? 'bg-green-500/20 text-green-400 group-hover:bg-green-500/40' : 'bg-amber-500/20 text-amber-400 group-hover:bg-amber-500/40'}`}>
                    {analyst.sla}%
                  </span>
                </td>
                <td className="px-6 py-4 text-center text-slate-400 group-hover:text-slate-200 transition-colors">{analyst.avgTime}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {(!data?.analysts || data.analysts.length === 0) && !isLoading && (
          <div className="py-10 text-center text-slate-500 text-xs">Clique em buscar para carregar o ranking</div>
        )}
      </div>
    </div>
  );
}
