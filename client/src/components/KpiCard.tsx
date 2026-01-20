import { motion } from "framer-motion";
import { ReactNode } from "react";

interface KPICardProps {
  label: string;
  value: string | number;
  icon: ReactNode;
  trend?: string;
  color?: "blue" | "green" | "amber" | "gray";
}

const colorStyles = {
  blue: {
    base: "from-[#20a7df]/10 to-[#20a7df]/5 border-[#20a7df]/20 text-[#20a7df]",
    hover: "hover:border-[#20a7df]/50 hover:shadow-[#20a7df]/10 hover:from-[#20a7df]/20",
    iconBg: "bg-[#20a7df]/10"
  },
  green: {
    base: "from-[#87ca83]/10 to-[#87ca83]/5 border-[#87ca83]/20 text-[#87ca83]",
    hover: "hover:border-[#87ca83]/50 hover:shadow-[#87ca83]/10 hover:from-[#87ca83]/20",
    iconBg: "bg-[#87ca83]/10"
  },
  amber: {
    base: "from-amber-500/10 to-amber-500/5 border-amber-500/20 text-amber-400",
    hover: "hover:border-amber-500/50 hover:shadow-amber-500/10 hover:from-amber-500/20",
    iconBg: "bg-amber-500/10"
  },
  gray: {
    base: "from-[#5f656d]/10 to-[#5f656d]/5 border-[#5f656d]/20 text-[#5f656d]",
    hover: "hover:border-[#5f656d]/50 hover:shadow-[#5f656d]/10 hover:from-[#5f656d]/20",
    iconBg: "bg-[#5f656d]/10"
  },
};

export default function KPICard({ label, value, icon, trend, color = "blue" }: KPICardProps) {
  const style = colorStyles[color];
  
  return (
    <motion.div
      whileHover={{ y: -8, scale: 1.02 }}
      transition={{ type: "spring", stiffness: 300 }}
      className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br ${style.base} ${style.hover} p-6 shadow-xl backdrop-blur-sm transition-all duration-300 cursor-default group`}
    >
      <div className="flex items-start justify-between relative z-10">
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 group-hover:text-white transition-colors">{label}</p>
          <h3 className="text-3xl font-bold tracking-tight text-white group-hover:scale-105 origin-left transition-transform">
            {value}
          </h3>
        </div>
        <div className={`p-3 rounded-xl ${style.iconBg} border border-white/5 group-hover:border-white/20 group-hover:bg-white/10 transition-all`}>
          <div className="group-hover:scale-110 transition-transform">
            {icon}
          </div>
        </div>
      </div>
      
      {trend && (
        <div className="mt-4 flex items-center gap-2 relative z-10">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest group-hover:text-slate-300 transition-colors">{trend}</span>
        </div>
      )}
      
      {/* Glow effect on hover */}
      <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-white/5 rounded-full blur-3xl group-hover:bg-white/10 transition-all duration-500" />
    </motion.div>
  );
}
