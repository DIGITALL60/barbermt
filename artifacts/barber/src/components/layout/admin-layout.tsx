import { Link, useLocation } from "wouter";
import { Calendar, Users, Scissors, LayoutDashboard, LogOut, Activity } from "lucide-react";
import { useHealthCheck } from "@workspace/api-client-react";

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { data: health } = useHealthCheck();

  const navItems = [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/appointments", label: "Appointments", icon: Calendar },
    { href: "/admin/barbers", label: "Barbers", icon: Users },
    { href: "/admin/services", label: "Services", icon: Scissors },
  ];

  return (
    <div className="min-h-[100dvh] flex w-full bg-background">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card hidden md:flex flex-col">
        <div className="p-6">
          <h2 className="text-xl font-bold text-primary uppercase tracking-widest flex items-center gap-2">
            King Admin
          </h2>
          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
            <Activity className="w-3 h-3" />
            System: {health?.status === "ok" ? <span className="text-green-500">Online</span> : <span className="text-red-500">Offline</span>}
          </div>
        </div>
        <nav className="flex-1 px-4 space-y-2">

          {navItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors cursor-pointer ${
                    isActive
                      ? "bg-primary text-primary-foreground font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </div>
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-border">
          <Link href="/">
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer">
              <LogOut className="w-5 h-5" />
              Public Site
            </div>
          </Link>
        </div>
      </aside>

      {/* Mobile nav could go here */}

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
