import { useState } from "react";
import { AdminLayout } from "@/components/layout/admin-layout";
import {
  useListAppointments,
  useUpdateAppointment,
  useDeleteAppointment,
  useListBarbers,
  useGetAppointment,
  getListAppointmentsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon, Check, X, Loader2, Trash2, Eye, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente",
  confirmed: "Confirmado",
  completed: "Completado",
  cancelled: "Cancelado",
};

const STATUS_CLASSES: Record<string, string> = {
  confirmed: "bg-green-500/10 text-green-500 border-green-500/20",
  pending: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  completed: "bg-primary/10 text-primary border-primary/20",
  cancelled: "bg-red-500/10 text-red-500 border-red-500/20",
};

function AppointmentDetailsDialog({ id, open, onOpenChange }: { id: number | null, open: boolean, onOpenChange: (o: boolean) => void }) {
  const { data: apt, isLoading } = useGetAppointment(id || 0, { query: { enabled: !!id && open } });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Detalle del turno</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div>
        ) : apt ? (
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Cliente</p>
                <p className="font-semibold">{apt.clientName}</p>
                <p className="text-sm text-muted-foreground">{apt.clientPhone}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Estado</p>
                <Badge variant="outline" className={`mt-1 ${STATUS_CLASSES[apt.status] ?? ""}`}>
                  {STATUS_LABELS[apt.status] ?? apt.status}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Servicio</p>
                <p className="font-semibold">{apt.serviceName}</p>
                {apt.servicePrice != null && (
                  <p className="text-sm text-muted-foreground">${apt.servicePrice.toLocaleString("es-AR")}</p>
                )}
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Barbero</p>
                <p className="font-semibold">{apt.barberName}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Fecha y hora</p>
                <p className="font-semibold capitalize">{apt.date && format(new Date(apt.date + "T00:00:00"), "d 'de' MMMM yyyy", { locale: es })}</p>
                <p className="text-sm text-muted-foreground">{apt.timeSlot}</p>
              </div>
            </div>
            {apt.notes && (
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Notas</p>
                <p className="text-sm italic text-muted-foreground">"{apt.notes}"</p>
              </div>
            )}
          </div>
        ) : (
          <div className="p-8 text-center text-muted-foreground">No encontrado.</div>
        )}
      </DialogContent>
    </Dialog>
  );
}

const API_BASE = import.meta.env.VITE_API_URL || "";

function handleExportCSV() {
  window.open(`${API_BASE}/api/appointments/export`, "_blank");
}

export default function AppointmentsPage() {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [barberId, setBarberId] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [selectedAptId, setSelectedAptId] = useState<number | null>(null);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: barbers } = useListBarbers();

  const formattedDate = date ? format(date, "yyyy-MM-dd") : undefined;

  const { data: appointments, isLoading } = useListAppointments({
    date: formattedDate,
    barberId: barberId !== "all" ? parseInt(barberId) : undefined,
    status: status !== "all" ? status : undefined
  });

  const updateStatus = useUpdateAppointment({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListAppointmentsQueryKey() });
        toast({ title: "Estado actualizado" });
      }
    }
  });

  const deleteApt = useDeleteAppointment({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListAppointmentsQueryKey() });
        toast({ title: "Turno eliminado" });
      }
    }
  });

  const handleStatusChange = (id: number, newStatus: string) => {
    updateStatus.mutate({ id, data: { status: newStatus } });
  };

  const handleDelete = (id: number) => {
    if (confirm("¿Confirmás que querés eliminar este turno?")) {
      deleteApt.mutate({ id });
    }
  };

  return (
    <AdminLayout>
      <AppointmentDetailsDialog
        id={selectedAptId}
        open={!!selectedAptId}
        onOpenChange={(o) => !o && setSelectedAptId(null)}
      />
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold">Turnos</h1>
            <p className="text-muted-foreground mt-1">Gestioná todas las reservas</p>
          </div>
          <Button variant="outline" onClick={handleExportCSV} className="gap-2 shrink-0">
            <Download className="w-4 h-4" />
            Exportar CSV
          </Button>
        </div>

        <Card>
          <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-end flex-wrap">
            <div className="space-y-1.5 w-full md:w-auto">
              <label className="text-sm font-medium text-muted-foreground">Fecha</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full md:w-[220px] justify-start text-left font-normal bg-card">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "d 'de' MMMM yyyy", { locale: es }) : <span className="text-muted-foreground">Todas las fechas</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={date} onSelect={setDate} locale={es} initialFocus />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-1.5 w-full md:w-auto">
              <label className="text-sm font-medium text-muted-foreground">Barbero</label>
              <Select value={barberId} onValueChange={setBarberId}>
                <SelectTrigger className="w-full md:w-[190px] bg-card">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {barbers?.map(b => (
                    <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 w-full md:w-auto">
              <label className="text-sm font-medium text-muted-foreground">Estado</label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-full md:w-[190px] bg-card">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pending">Pendiente</SelectItem>
                  <SelectItem value="confirmed">Confirmado</SelectItem>
                  <SelectItem value="completed">Completado</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              variant="ghost"
              className="text-muted-foreground"
              onClick={() => { setDate(undefined); setBarberId("all"); setStatus("all"); }}
            >
              Limpiar filtros
            </Button>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : appointments?.length ? (
          <div className="space-y-3">
            {appointments.map(apt => (
              <Card key={apt.id}>
                <CardContent className="p-5 flex flex-col md:flex-row items-start md:items-center gap-5">
                  <div className="text-2xl font-bold text-primary w-20 shrink-0 text-center">
                    {apt.timeSlot}
                  </div>

                  <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <div className="font-semibold text-base">{apt.clientName}</div>
                      <div className="text-sm text-muted-foreground">{apt.clientPhone}</div>
                      {apt.notes && (
                        <div className="text-xs italic text-muted-foreground mt-1">"{apt.notes}"</div>
                      )}
                    </div>
                    <div>
                      <div className="font-medium">{apt.serviceName}</div>
                      <div className="text-sm text-muted-foreground">{apt.barberName}</div>
                      <div className="mt-1.5">
                        <Badge variant="outline" className={STATUS_CLASSES[apt.status] ?? "bg-muted"}>
                          {STATUS_LABELS[apt.status] ?? apt.status}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 justify-end w-full md:w-auto shrink-0">
                    <Button size="sm" variant="ghost" onClick={() => setSelectedAptId(apt.id)}>
                      <Eye className="w-4 h-4 mr-1.5" /> Ver
                    </Button>
                    {apt.status === 'pending' && (
                      <Button size="sm" variant="outline" className="border-green-500/50 hover:bg-green-500/10 hover:text-green-500"
                        onClick={() => handleStatusChange(apt.id, 'confirmed')}
                        disabled={updateStatus.isPending}
                      >
                        <Check className="w-4 h-4 mr-1.5" /> Confirmar
                      </Button>
                    )}
                    {apt.status === 'confirmed' && (
                      <Button size="sm" variant="outline" className="border-primary/50 hover:bg-primary/10 hover:text-primary"
                        onClick={() => handleStatusChange(apt.id, 'completed')}
                        disabled={updateStatus.isPending}
                      >
                        <Check className="w-4 h-4 mr-1.5" /> Completar
                      </Button>
                    )}
                    {(apt.status === 'pending' || apt.status === 'confirmed') && (
                      <Button size="sm" variant="outline" className="border-yellow-500/50 hover:bg-yellow-500/10 hover:text-yellow-500"
                        onClick={() => handleStatusChange(apt.id, 'cancelled')}
                        disabled={updateStatus.isPending}
                      >
                        <X className="w-4 h-4 mr-1.5" /> Cancelar
                      </Button>
                    )}
                    <Button size="sm" variant="outline" className="border-red-500/50 hover:bg-red-500/10 hover:text-red-500"
                      onClick={() => handleDelete(apt.id)}
                      disabled={deleteApt.isPending}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center">
              <CalendarIcon className="w-12 h-12 mb-4 opacity-20" />
              <p className="text-lg font-medium">No se encontraron turnos</p>
              <p className="text-sm mt-1">Probá con otros filtros</p>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
