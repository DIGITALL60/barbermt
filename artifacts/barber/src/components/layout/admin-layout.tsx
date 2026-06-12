import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  Calendar, Users, Scissors, LayoutDashboard,
  ExternalLink, Activity, Clock, LogOut, Menu, X, TrendingUp, MessageSquare
} from "lucide-react";
import { useHealthCheck } from "@workspace/api-client-react";
import { useAdminAuth } from "@/lib/admin-auth";

const navItems = [
  { href: "/admin", label: "Panel", icon: LayoutDashboard },
  { href: "/admin/appointments", label: "Turnos", icon: Calendar },
  { href: "/admin/schedule", label: "Disponibilidad", icon: Clock },
  { href: "/admin/barbers", label: "Barberos", icon: Users },
  { href: "/admin/services", label: "Servicios", icon: Scissors },
  { href: "/admin/finances", label: "Finanzas", icon: TrendingUp },
  { href: "/admin/bot", label: "WhatsApp Bot", icon: MessageSquare },
];

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { data: health } = useHealthCheck();
  const { logout } = useAdminAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-[100dvh] flex w-full bg-background">

      {/* ── SIDEBAR DESKTOP ── */}
      <aside className="w-64 border-r border-border bg-card hidden md:flex flex-col shrink-0">
        <div className="p-5 border-b border-border flex items-center gap-3">
          <img src="/logo-mt.svg" alt="Barber M.T" className="h-9 w-9 shrink-0" />
          <div>
            <h2 className="text-sm font-black text-primary uppercase tracking-widest leading-none">Barber M.T</h2>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
              <Activity className="w-3 h-3" />
              {health?.status === "ok"
                ? <span className="text-green-500">En línea</span>
                : <span className="text-red-500">Desconectado</span>}
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <div className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors cursor-pointer text-sm ${
                  isActive
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}>
                  <item.icon className="w-4 h-4 shrink-0" />
                  {item.label}
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-border space-y-1">
          <Link href="/">
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer text-sm">
              <ExternalLink className="w-4 h-4 shrink-0" />
              Ver sitio público
            </div>
          </Link>
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer text-sm"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* ── LAYOUT MÓVIL ── */}
      <div className="flex-1 flex flex-col min-w-0 min-h-[100dvh]">

        {/* Header móvil */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-card sticky top-0 z-30">
          <div className="flex items-center gap-2">
            <img src="/logo-mt.svg" alt="Barber M.T" className="h-7 w-7" />
            <span className="font-black text-primary uppercase tracking-widest text-sm">Barber M.T</span>
          </div>
          <button
            onClick={() => setMenuOpen(true)}
            className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
        </header>

        {/* Drawer menú móvil */}
        {menuOpen && (
          <div className="md:hidden fixed inset-0 z-50 flex">
            {/* Overlay */}
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setMenuOpen(false)}
            />
            {/* Panel */}
            <div className="relative ml-auto w-72 bg-card h-full flex flex-col shadow-2xl">
              <div className="flex items-center justify-between p-5 border-b border-border">
                <div className="flex items-center gap-2">
                  <img src="/logo-mt.svg" alt="Barber M.T" className="h-8 w-8" />
                  <span className="font-black text-primary uppercase tracking-widest text-sm">Barber M.T</span>
                </div>
                <button
                  onClick={() => setMenuOpen(false)}
                  className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex items-center gap-2 px-5 py-3 border-b border-border">
                <Activity className="w-3.5 h-3.5 text-muted-foreground" />
                {health?.status === "ok"
                  ? <span className="text-green-500 text-sm">Sistema en línea</span>
                  : <span className="text-red-500 text-sm">Desconectado</span>}
              </div>

              <nav className="flex-1 px-3 py-4 space-y-1">
                {navItems.map((item) => {
                  const isActive = location === item.href;
                  return (
                    <Link key={item.href} href={item.href}>
                      <div
                        onClick={() => setMenuOpen(false)}
                        className={`flex items-center gap-3 px-4 py-3 rounded-md transition-colors cursor-pointer text-base ${
                          isActive
                            ? "bg-primary text-primary-foreground font-semibold"
                            : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                        }`}
                      >
                        <item.icon className="w-5 h-5 shrink-0" />
                        {item.label}
                      </div>
                    </Link>
                  );
                })}
              </nav>

              <div className="p-3 border-t border-border space-y-1">
                <Link href="/">
                  <div
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer text-base"
                  >
                    <ExternalLink className="w-5 h-5 shrink-0" />
                    Ver sitio público
                  </div>
                </Link>
                <button
                  onClick={() => { setMenuOpen(false); logout(); }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-md text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer text-base"
                >
                  <LogOut className="w-5 h-5 shrink-0" />
                  Cerrar sesión
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Contenido */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-6">
          {children}
        </main>

        {/* Barra inferior móvil */}
        <nav className="md:hidden sticky bottom-0 z-20 border-t border-border bg-card flex items-center justify-around px-1 py-1 safe-area-inset-bottom">
          {navItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <div className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg transition-colors cursor-pointer min-w-[56px] ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`}>
                  <item.icon className={`w-5 h-5 ${isActive ? "stroke-[2.5]" : ""}`} />
                  <span className={`text-[10px] font-medium leading-tight text-center ${isActive ? "text-primary" : ""}`}>
                    {item.label}
                  </span>
                </div>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
