import { NavLink, Outlet } from "react-router-dom";

export default function Layout() {
  const containerClass = "min-h-screen bg-slate-100 text-slate-900";
  const headerClass = "border-b border-slate-200 bg-white/90 px-4 py-3 text-slate-900 shadow-sm";
  const brandTextClass =
    "flex items-center gap-2 text-sm font-semibold tracking-[0.2em] text-slate-500 uppercase";

  const pillClass = (active: boolean) =>
    [
      "rounded-full px-3 py-1.5 text-xs font-medium transition",
      active
        ? "bg-slate-900 text-slate-50 shadow-sm"
        : "bg-transparent text-slate-600 hover:bg-slate-100",
    ].join(" ");

  return (
    <div className={containerClass}>
      <header className={headerClass}>
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div className={brandTextClass}>
            <span className="h-2 w-2 rounded-full bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.8)]" />
            Under • Service Analytics
          </div>
          <div className="flex items-center gap-4">
            <nav className="flex gap-2 text-xs font-medium">
              <NavLink to="/" end className={({ isActive }: { isActive: boolean }) => pillClass(isActive)}>
                Visão Geral
              </NavLink>
              <NavLink to="/kpis" className={({ isActive }: { isActive: boolean }) => pillClass(isActive)}>
                KPIs
              </NavLink>
              <NavLink to="/equipe" className={({ isActive }: { isActive: boolean }) => pillClass(isActive)}>
                Performance
              </NavLink>
              <NavLink to="/telefonia" className={({ isActive }: { isActive: boolean }) => pillClass(isActive)}>
                Telefonia
              </NavLink>
            </nav>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-10 pt-6 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
}
