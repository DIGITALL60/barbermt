import { AdminLayout } from "@/components/layout/admin-layout";
import { useGetDashboardSummary, useGetTodayAppointments } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, CheckCircle, DollarSign, Clock } from "lucide-react";

function formatPrice(n: number) {
  return `$${n.toLocaleString("es-AR")}`;
}

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente",
  confirmed: "Confirmado",
  completed: "Completado",
  cancelled: "Cancelado",
};

const STATUS_CLASSES: Record<string, string> = {
  confirmed: "bg-green-500/20 text-green-400",
  pending: "bg-yellow-500/20 text-yellow-400",
  completed: "bg-primary/20 text-primary",
  cancelled: "bg-red-500/20 text-red-400",
};

export default function DashboardPage() {
  const { data: summary, isLoading: isLoadingSummary } = useGetDashboardSummary();
  const { data: todayAppointments, isLoading: isLoadingToday } = useGetTodayAppointments();

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Panel de control</h1>
          <p className="text-muted-foreground mt-1">Resumen del negocio</p>
        </div>

        {isLoadingSummary ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader className="h-24 bg-muted/50 rounded-t-lg" />
              </Card>
            ))}
          </div>
        ) : summary ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Turnos hoy</CardTitle>
                <Calendar className="w-4 h-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{summary.todayCount}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Pendientes</CardTitle>
                <Clock className="w-4 h-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{summary.pendingCount}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Completados esta semana</CardTitle>
                <CheckCircle className="w-4 h-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{summary.weekCount}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Ingresos totales</CardTitle>
                <DollarSign className="w-4 h-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{formatPrice(summary.totalRevenue)}</div>
              </CardContent>
            </Card>
          </div>
        ) : null}

        {(summary?.topBarber || summary?.topService) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {summary.topBarber && (
              <Card>
                <CardContent className="p-6">
                  <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Barbero más solicitado</p>
                  <p className="text-xl font-bold text-primary">{summary.topBarber}</p>
                </CardContent>
              </Card>
            )}
            {summary.topService && (
              <Card>
                <CardContent className="p-6">
                  <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Servicio más pedido</p>
                  <p className="text-xl font-bold text-primary">{summary.topService}</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        <div>
          <h2 className="text-xl font-semibold mb-4">Agenda de hoy</h2>
          {isLoadingToday ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 bg-muted/50 rounded-md animate-pulse" />
              ))}
            </div>
          ) : todayAppointments?.length ? (
            <div className="space-y-3">
              {todayAppointments.map((apt) => (
                <Card key={apt.id}>
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-4">
                      <div className="text-lg font-bold text-primary w-16 shrink-0">{apt.timeSlot}</div>
                      <div>
                        <div className="font-semibold">{apt.clientName}</div>
                        <div className="text-sm text-muted-foreground">{apt.serviceName} · {apt.barberName}</div>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs uppercase tracking-wider font-semibold ${STATUS_CLASSES[apt.status] ?? "bg-muted text-muted-foreground"}`}>
                      {STATUS_LABELS[apt.status] ?? apt.status}
                    </span>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-10 text-center text-muted-foreground">
                No hay turnos agendados para hoy.
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
