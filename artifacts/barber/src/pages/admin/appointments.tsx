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
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon, Check, X, Clock, Loader2, Trash2, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

function AppointmentDetailsDialog({ id, open, onOpenChange }: { id: number | null, open: boolean, onOpenChange: (o: boolean) => void }) {
  const { data: apt, isLoading } = useGetAppointment(id || 0, { query: { enabled: !!id && open } });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Appointment Details</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div>
        ) : apt ? (
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground uppercase tracking-wider">Client</p>
                <p className="font-semibold">{apt.clientName}</p>
                <p className="text-sm">{apt.clientPhone}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground uppercase tracking-wider">Status</p>
                <Badge variant="outline" className="mt-1">{apt.status}</Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground uppercase tracking-wider">Service</p>
                <p className="font-semibold">{apt.serviceName}</p>
                <p className="text-sm">${apt.servicePrice}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground uppercase tracking-wider">Barber</p>
                <p className="font-semibold">{apt.barberName}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground uppercase tracking-wider">Date & Time</p>
                <p className="font-semibold">{apt.date}</p>
                <p className="text-sm">{apt.timeSlot}</p>
              </div>
            </div>
            {apt.notes && (
              <div>
                <p className="text-sm text-muted-foreground uppercase tracking-wider">Notes</p>
                <p className="text-sm italic">"{apt.notes}"</p>
              </div>
            )}
          </div>
        ) : (
          <div className="p-8 text-center text-muted-foreground">Not found.</div>
        )}
      </DialogContent>
    </Dialog>
  );
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
        toast({ title: "Status updated" });
      }
    }
  });

  const deleteApt = useDeleteAppointment({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListAppointmentsQueryKey() });
        toast({ title: "Appointment deleted" });
      }
    }
  });

  const handleStatusChange = (id: number, newStatus: string) => {
    updateStatus.mutate({ id, data: { status: newStatus } });
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this appointment?")) {
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
        <div>
          <h1 className="text-3xl font-bold">Appointments</h1>
          <p className="text-muted-foreground mt-2">Manage your bookings</p>
        </div>

        <Card>
          <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-end">
            <div className="space-y-2 w-full md:w-auto">
              <label className="text-sm font-medium">Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full md:w-[240px] justify-start text-left font-normal bg-card">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2 w-full md:w-auto">
              <label className="text-sm font-medium">Barber</label>
              <Select value={barberId} onValueChange={setBarberId}>
                <SelectTrigger className="w-full md:w-[200px] bg-card">
                  <SelectValue placeholder="All Barbers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Barbers</SelectItem>
                  {barbers?.map(b => (
                    <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 w-full md:w-auto">
              <label className="text-sm font-medium">Status</label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-full md:w-[200px] bg-card">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button 
              variant="ghost" 
              onClick={() => {
                setDate(undefined);
                setBarberId("all");
                setStatus("all");
              }}
            >
              Clear Filters
            </Button>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : appointments?.length ? (
          <div className="space-y-4">
            {appointments.map(apt => (
              <Card key={apt.id}>
                <CardContent className="p-6 flex flex-col md:flex-row items-center gap-6">
                  <div className="text-2xl font-bold text-primary w-24 text-center">
                    {apt.timeSlot}
                  </div>
                  
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="font-semibold text-lg">{apt.clientName}</div>
                      <div className="text-muted-foreground">{apt.clientPhone}</div>
                      {apt.notes && (
                        <div className="text-sm italic text-muted-foreground mt-1">"{apt.notes}"</div>
                      )}
                    </div>
                    <div>
                      <div className="font-medium">{apt.serviceName}</div>
                      <div className="text-muted-foreground">{apt.barberName}</div>
                      <div className="text-sm mt-1">
                        <Badge variant="outline" className={
                          apt.status === 'confirmed' ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                          apt.status === 'pending' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' :
                          apt.status === 'completed' ? 'bg-primary/10 text-primary border-primary/20' :
                          'bg-red-500/10 text-red-500 border-red-500/20'
                        }>
                          {apt.status.toUpperCase()}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 justify-end w-full md:w-auto">
                    <Button size="sm" variant="ghost" onClick={() => setSelectedAptId(apt.id)}>
                      <Eye className="w-4 h-4 mr-2" /> Details
                    </Button>
                    {apt.status === 'pending' && (
                      <Button size="sm" variant="outline" className="border-green-500/50 hover:bg-green-500/10 hover:text-green-500"
                        onClick={() => handleStatusChange(apt.id, 'confirmed')}
                        disabled={updateStatus.isPending}
                      >
                        <Check className="w-4 h-4 mr-2" /> Confirm
                      </Button>
                    )}
                    {apt.status === 'confirmed' && (
                      <Button size="sm" variant="outline" className="border-primary/50 hover:bg-primary/10 hover:text-primary"
                        onClick={() => handleStatusChange(apt.id, 'completed')}
                        disabled={updateStatus.isPending}
                      >
                        <Check className="w-4 h-4 mr-2" /> Complete
                      </Button>
                    )}
                    {(apt.status === 'pending' || apt.status === 'confirmed') && (
                      <Button size="sm" variant="outline" className="border-yellow-500/50 hover:bg-yellow-500/10 hover:text-yellow-500"
                        onClick={() => handleStatusChange(apt.id, 'cancelled')}
                        disabled={updateStatus.isPending}
                      >
                        <X className="w-4 h-4 mr-2" /> Cancel
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
              <p className="text-lg">No appointments found</p>
              <p className="text-sm">Try adjusting your filters</p>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
