import { AdminLayout } from "@/components/layout/admin-layout";
import { useGetDashboardSummary, useGetTodayAppointments, useListAppointments } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, CheckCircle, DollarSign, Clock } from "lucide-react";

function formatPrice(n: number) {
  return `$${n.toLocaleString("es-AR")}`;
}

// Normaliza cualquier respuesta de la API a un array
function toArray<T>(data: unknown): T[] {
  if (!data) return [];
  if (Array.isArray(data)) return data as T[];
  const obj = data as Record<string, unknown>;
  for (const key of ["data", "items", "appointments", "results"]) {
    if (Array.isArray(obj[key])) return obj[key] as T[];
  }
  return [];
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
  const { data: todayAppointmentsRaw, isLoading: isLoadingToday } = useGetTodayAppointments();
  const { data: allAppointmentsRaw, isLoading: isLoadingAll } = useListAppointments({});

  const todayAppointments = toArray<any>(todayAppointmentsRaw);
  const allAppointments = toArray<any>(allAppointmentsRaw);

  const todayStr = new Date().toISOString().split("T")[0];
  const upcomingAppointments = allAppointments
    .filter((apt) => apt.date > todayStr && apt.status !== "cancelled" && apt.status !== "completed")
    .slice(0, 5);

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
                <div className="text-3xl font-bold">{(summary as any).todayCount}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Pendientes</CardTitle>
                <Clock className="w-4 h-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{(summary as any).pendingCount}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Completados esta semana</CardTitle>
                <CheckCircle className="w-4 h-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{(summary as any).weekCount}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Ingresos totales</CardTitle>
                <DollarSign className="w-4 h-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{formatPrice((summary as any).totalRevenue)}</div>
              </CardContent>
            </Card>
          </div>
        ) : null}

        {((summary as any)?.topBarber || (summary as any)?.topService) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(summary as any).topBarber && (
              <Card>
                <CardContent className="p-6">
                  <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Barbero más solicitado</p>
                  <p className="text-xl font-bold text-primary">{(summary as any).topBarber}</p>
                </CardContent>
              </Card>
            )}
            {(summary as any).topService && (
              <Card>
                <CardContent className="p-6">
                  <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Servicio más pedido</p>
                  <p className="text-xl font-bold text-primary">{(summary as any).topService}</p>
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
          ) : todayAppointments.length ? (
            <div className="space-y-3">
              {todayAppointments.map((apt) => (
                <Card key={apt.id}>
                  <CardContent className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-3">
                    <div className="flex items-center gap-4">
                      <div className="text-lg font-bold text-primary w-16 shrink-0 text-center">{apt.timeSlot}</div>
                      <div>
                        <div className="font-semibold line-clamp-1">{apt.clientName}</div>
                        <div className="text-sm text-muted-foreground line-clamp-1">{apt.serviceName} · {apt.barberName}</div>
                      </div>
                    </div>
                    <span className={`self-start sm:self-auto px-3 py-1 rounded-full text-xs uppercase tracking-wider font-semibold shrink-0 ${STATUS_CLASSES[apt.status] ?? "bg-muted text-muted-foreground"}`}>
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

        <div>
          <h2 className="text-xl font-semibold mb-4">Próximos turnos</h2>
          {isLoadingAll ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 bg-muted/50 rounded-md animate-pulse" />
              ))}
            </div>
          ) : upcomingAppointments.length ? (
            <div className="space-y-3">
              {upcomingAppointments.map((apt) => {
                const dateParts = apt.date.split("-");
                const formattedDate = dateParts.length === 3 ? `${dateParts[2]}/${dateParts[1]}` : apt.date;
                return (
                  <Card key={apt.id}>
                    <CardContent className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-3">
                      <div className="flex items-center gap-4">
                        <div className="text-center w-16 shrink-0">
                          <div className="text-sm font-semibold text-muted-foreground">{formattedDate}</div>
                          <div className="text-lg font-bold text-primary">{apt.timeSlot}</div>
                        </div>
                        <div>
                          <div className="font-semibold line-clamp-1">{apt.clientName}</div>
                          <div className="text-sm text-muted-foreground line-clamp-1">{apt.serviceName} · {apt.barberName}</div>
                        </div>
                      </div>
                      <span className={`self-start sm:self-auto px-3 py-1 rounded-full text-xs uppercase tracking-wider font-semibold shrink-0 ${STATUS_CLASSES[apt.status] ?? "bg-muted text-muted-foreground"}`}>
                        {STATUS_LABELS[apt.status] ?? apt.status}
                      </span>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="p-10 text-center text-muted-foreground">
                No hay próximos turnos agendados.
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
