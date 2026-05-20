import { Link, useLocation } from "wouter";
import { Calendar, Users, Scissors, LayoutDashboard, ExternalLink, Activity } from "lucide-react";
import { useHealthCheck } from "@workspace/api-client-react";

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { data: health } = useHealthCheck();

  const navItems = [
    { href: "/admin", label: "Panel", icon: LayoutDashboard },
    { href: "/admin/appointments", label: "Turnos", icon: Calendar },
    { href: "/admin/barbers", label: "Barberos", icon: Users },
    { href: "/admin/services", label: "Servicios", icon: Scissors },
  ];

  return (
    <div className="min-h-[100dvh] flex w-full bg-background">
      <aside className="w-64 border-r border-border bg-card hidden md:flex flex-col">
        <div className="p-6 border-b border-border">
          <h2 className="text-lg font-black text-primary uppercase tracking-widest flex items-center gap-2">
            <Scissors className="w-5 h-5" /> New King Barber
          </h2>
          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
            <Activity className="w-3 h-3" />
            Sistema:{" "}
            {health?.status === "ok"
              ? <span className="text-green-500">En línea</span>
              : <span className="text-red-500">Desconectado</span>}
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors cursor-pointer text-sm ${
                    isActive
                      ? "bg-primary text-primary-foreground font-semibold"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
                >
                  <item.icon className="w-4 h-4 shrink-0" />
                  {item.label}
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-border">
          <Link href="/">
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer text-sm">
              <ExternalLink className="w-4 h-4 shrink-0" />
              Ver sitio público
            </div>
          </Link>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
