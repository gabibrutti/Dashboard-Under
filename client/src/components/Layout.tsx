import { NavLink, Outlet } from "react-router-dom";
import { LayoutDashboard, TrendingUp, Phone, BarChart3 } from "lucide-react";

export default function Layout() {
  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group ${
      isActive 
        ? "bg-[#20a7df] text-white shadow-lg shadow-[#20a7df]/30 scale-[1.02]" 
        : "text-slate-400 hover:bg-[#20a7df]/10 hover:text-[#20a7df] hover:translate-x-1"
    }`;

  return (
    <div className="flex min-h-screen bg-[#001831] text-white">
      {/* Sidebar */}
      <aside className="w-64 border-r border-white/10 flex flex-col fixed h-full bg-[#001831] z-20">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-8 w-8 rounded-lg bg-[#20a7df] flex items-center justify-center font-bold text-white shadow-[0_0_15px_rgba(32,167,223,0.4)]">U</div>
            <div>
              <h2 className="text-sm font-bold tracking-tight">DASHBOARD</h2>
              <p className="text-[10px] text-[#20a7df] font-semibold uppercase tracking-wider">Under • Service Analytics</p>
            </div>
          </div>
          
          <nav className="space-y-2">
            <NavLink to="/" end className={navLinkClass}>
              <LayoutDashboard size={18} className="group-hover:scale-110 transition-transform" />
              <span className="text-sm font-medium">Visão Geral</span>
            </NavLink>
            <NavLink to="/equipe" className={navLinkClass}>
              <TrendingUp size={18} className="group-hover:scale-110 transition-transform" />
              <span className="text-sm font-medium">Performance</span>
            </NavLink>
            <NavLink to="/kpis" className={navLinkClass}>
              <BarChart3 size={18} className="group-hover:scale-110 transition-transform" />
              <span className="text-sm font-medium">KPIs</span>
            </NavLink>
            <NavLink to="/telefonia" className={navLinkClass}>
              <Phone size={18} className="group-hover:scale-110 transition-transform" />
              <span className="text-sm font-medium">Telefonia</span>
            </NavLink>
          </nav>
        </div>
        
        <div className="mt-auto p-6 border-t border-white/10">
          <div className="flex items-center gap-3 px-2">
            <div className="h-2 w-2 rounded-full bg-[#87ca83] animate-pulse shadow-[0_0_8px_rgba(135,202,131,0.8)]" />
            <span className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">Sistema Online</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 p-8">
        <Outlet />
      </main>
    </div>
  );
}
