import { useState } from "react";
import { useListServices, useListBarbers, useGetAvailability, useCreateAppointment } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Scissors, Clock, ArrowRight, ArrowLeft, CheckCircle2, User, Calendar as CalendarIcon, Phone, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type BookingState = {
  step: number;
  serviceId?: number;
  barberId?: number;
  date?: Date;
  timeSlot?: string;
  clientName: string;
  clientPhone: string;
  notes: string;
};

function formatPrice(price: number | string) {
  return `$${Number(price).toLocaleString("es-AR")}`;
}

export default function HomePage() {
  const { toast } = useToast();
  const [booking, setBooking] = useState<BookingState>({
    step: 1,
    clientName: "",
    clientPhone: "",
    notes: ""
  });

  const { data: services, isLoading: isLoadingServices } = useListServices({ activeOnly: true });
  const { data: barbers, isLoading: isLoadingBarbers } = useListBarbers({ activeOnly: true });

  const formattedDate = booking.date ? format(booking.date, "yyyy-MM-dd") : "";
  const { data: availability, isLoading: isLoadingAvailability } = useGetAvailability(
    { barberId: booking.barberId!, date: formattedDate, serviceId: booking.serviceId },
    { query: { enabled: !!booking.barberId && !!booking.date } }
  );

  const createAppointment = useCreateAppointment();

  const handleNext = () => setBooking(prev => ({ ...prev, step: prev.step + 1 }));
  const handleBack = () => setBooking(prev => ({ ...prev, step: prev.step - 1 }));

  const handleSubmit = () => {
    if (!booking.serviceId || !booking.barberId || !booking.date || !booking.timeSlot || !booking.clientName || !booking.clientPhone) {
      toast({ title: "Completá todos los campos requeridos", variant: "destructive" });
      return;
    }

    createAppointment.mutate({
      data: {
        serviceId: booking.serviceId,
        barberId: booking.barberId,
        date: formattedDate,
        timeSlot: booking.timeSlot,
        clientName: booking.clientName,
        clientPhone: booking.clientPhone,
        notes: booking.notes || undefined
      }
    }, {
      onSuccess: () => {
        setBooking(prev => ({ ...prev, step: 5 }));
      },
      onError: () => {
        toast({ title: "No se pudo reservar el turno. Intentá de nuevo.", variant: "destructive" });
      }
    });
  };

  const selectedService = services?.find(s => s.id === booking.serviceId);
  const selectedBarber = barbers?.find(b => b.id === booking.barberId);

  return (
    <div className="min-h-[100dvh] bg-background text-foreground flex flex-col selection:bg-primary selection:text-background">
      <header className="py-6 px-8 border-b border-border bg-card/50 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-black uppercase tracking-widest text-primary flex items-center gap-2">
            <Scissors className="w-6 h-6" /> New King Barber
          </h1>
          {booking.step < 5 && (
            <div className="text-sm font-medium text-muted-foreground tracking-widest uppercase">
              Paso {booking.step} de 4
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 flex flex-col w-full max-w-4xl mx-auto p-4 md:p-8">

        {booking.step === 1 && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-2xl mx-auto w-full">
            <h2 className="text-3xl font-bold mb-2 text-center uppercase tracking-wider">Elegí tu servicio</h2>
            <p className="text-center text-muted-foreground mb-8 text-sm">Seleccioná el servicio que querés</p>
            {isLoadingServices ? (
              <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
            ) : (
              <div className="grid gap-4">
                {services?.map(service => (
                  <button
                    key={service.id}
                    className={`text-left group relative overflow-hidden rounded-lg border transition-all duration-300
                      ${booking.serviceId === service.id
                        ? 'border-primary ring-1 ring-primary bg-primary/5'
                        : 'border-border bg-card hover:border-primary/50'}`}
                    onClick={() => {
                      setBooking(prev => ({ ...prev, serviceId: service.id }));
                      setTimeout(handleNext, 300);
                    }}
                  >
                    <div className="p-6 flex items-center justify-between z-10 relative">
                      <div>
                        <h3 className="text-xl font-bold mb-1">{service.name}</h3>
                        <p className="text-muted-foreground text-sm max-w-md">{service.description}</p>
                      </div>
                      <div className="text-right shrink-0 ml-4">
                        <div className="text-2xl font-black text-primary">{formatPrice(service.price)}</div>
                        <div className="flex items-center justify-end text-sm text-muted-foreground mt-1 gap-1">
                          <Clock className="w-3.5 h-3.5" /> {service.durationMinutes} min
                        </div>
                      </div>
                    </div>
                    {booking.serviceId === service.id && (
                      <div className="absolute inset-y-0 right-0 w-1 bg-primary" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {booking.step === 2 && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-2xl mx-auto w-full">
            <button onClick={handleBack} className="flex items-center text-muted-foreground hover:text-primary mb-6 transition-colors font-medium tracking-wide uppercase text-sm">
              <ArrowLeft className="w-4 h-4 mr-2" /> Volver
            </button>
            <h2 className="text-3xl font-bold mb-2 text-center uppercase tracking-wider">Elegí tu barbero</h2>
            <p className="text-center text-muted-foreground mb-8 text-sm">¿Con quién querés atenderte?</p>
            {isLoadingBarbers ? (
              <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
            ) : (
              <div className="grid gap-4">
                {barbers?.map(barber => (
                  <button
                    key={barber.id}
                    className={`text-left group relative overflow-hidden rounded-lg border transition-all duration-300
                      ${booking.barberId === barber.id
                        ? 'border-primary ring-1 ring-primary bg-primary/5'
                        : 'border-border bg-card hover:border-primary/50'}`}
                    onClick={() => {
                      setBooking(prev => ({ ...prev, barberId: barber.id }));
                      setTimeout(handleNext, 300);
                    }}
                  >
                    <div className="p-6 flex items-center gap-6 z-10 relative">
                      <div className="w-20 h-20 rounded-full overflow-hidden bg-secondary shrink-0 border-2 border-transparent group-hover:border-primary/20 transition-colors flex items-center justify-center">
                        {barber.photoUrl ? (
                          <img src={barber.photoUrl} alt={barber.name} className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-8 h-8 text-muted-foreground" />
                        )}
                      </div>
                      <div>
                        <h3 className="text-xl font-bold mb-2">{barber.name}</h3>
                        <p className="text-muted-foreground text-sm line-clamp-2">{barber.bio}</p>
                      </div>
                    </div>
                    {booking.barberId === barber.id && (
                      <div className="absolute inset-y-0 right-0 w-1 bg-primary" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {booking.step === 3 && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 w-full max-w-3xl mx-auto">
            <button onClick={handleBack} className="flex items-center text-muted-foreground hover:text-primary mb-6 transition-colors font-medium tracking-wide uppercase text-sm">
              <ArrowLeft className="w-4 h-4 mr-2" /> Volver
            </button>
            <h2 className="text-3xl font-bold mb-2 text-center uppercase tracking-wider">Elegí fecha y horario</h2>
            <p className="text-center text-muted-foreground mb-8 text-sm">Seleccioná el día y el horario disponible</p>

            <div className="grid md:grid-cols-2 gap-8 items-start">
              <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                <CardContent className="p-4 flex justify-center">
                  <Calendar
                    mode="single"
                    selected={booking.date}
                    onSelect={(d) => setBooking(prev => ({ ...prev, date: d, timeSlot: undefined }))}
                    disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0)) || date.getDay() === 0}
                    locale={es}
                    className="rounded-md"
                  />
                </CardContent>
              </Card>

              <div className="bg-card/50 p-6 rounded-lg border border-border/50 min-h-[350px]">
                {!booking.date ? (
                  <div className="h-full flex flex-col items-center justify-center text-muted-foreground min-h-[300px]">
                    <CalendarIcon className="w-12 h-12 mb-4 opacity-20" />
                    <p>Primero seleccioná una fecha</p>
                  </div>
                ) : isLoadingAvailability ? (
                  <div className="h-full flex items-center justify-center min-h-[300px]">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : availability?.slots.filter(s => s.available).length ? (
                  <div>
                    <p className="text-sm text-muted-foreground uppercase tracking-wider mb-4">Horarios disponibles</p>
                    <div className="grid grid-cols-3 gap-2 animate-in fade-in duration-300">
                      {availability.slots.filter(s => s.available).map(slot => (
                        <button
                          key={slot.time}
                          onClick={() => setBooking(prev => ({ ...prev, timeSlot: slot.time }))}
                          className={`py-3 px-2 rounded-md text-sm font-bold tracking-wider transition-all
                            ${booking.timeSlot === slot.time
                              ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-105'
                              : 'bg-secondary hover:bg-secondary/80 text-foreground hover:text-primary'
                            }`}
                        >
                          {slot.time}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-muted-foreground min-h-[300px]">
                    <CalendarIcon className="w-12 h-12 mb-4 opacity-20" />
                    <p>Sin horarios disponibles para este día.</p>
                    <p className="text-sm mt-1">Probá con otro día.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-8 flex justify-end">
              <Button
                size="lg"
                disabled={!booking.timeSlot}
                onClick={handleNext}
                className="w-full md:w-auto font-bold tracking-widest uppercase px-8"
              >
                Continuar <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {booking.step === 4 && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto w-full">
            <button onClick={handleBack} className="flex items-center text-muted-foreground hover:text-primary mb-6 transition-colors font-medium tracking-wide uppercase text-sm">
              <ArrowLeft className="w-4 h-4 mr-2" /> Volver
            </button>
            <h2 className="text-3xl font-bold mb-2 text-center uppercase tracking-wider">Confirmá tu turno</h2>
            <p className="text-center text-muted-foreground mb-8 text-sm">Revisá los detalles e ingresá tus datos</p>

            <div className="grid md:grid-cols-5 gap-8">
              <div className="md:col-span-2 space-y-6">
                <Card className="bg-card border-primary/20">
                  <CardContent className="p-6 space-y-5">
                    <div className="pb-5 border-b border-border">
                      <div className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Fecha y hora</div>
                      <div className="text-xl font-bold capitalize">
                        {booking.date && format(booking.date, "EEEE d 'de' MMMM", { locale: es })}
                      </div>
                      <div className="text-3xl font-black text-primary mt-1">{booking.timeSlot}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Servicio</div>
                      <div className="font-bold text-lg">{selectedService?.name}</div>
                      <div className="text-muted-foreground text-sm">{formatPrice(selectedService?.price ?? 0)} · {selectedService?.durationMinutes} min</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Barbero</div>
                      <div className="font-bold text-lg">{selectedBarber?.name}</div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="md:col-span-3 space-y-6">
                <div className="bg-card p-6 md:p-8 rounded-lg border border-border">
                  <h3 className="text-xl font-bold mb-6 uppercase tracking-wider">Tus datos</h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="uppercase tracking-wider text-xs">Nombre completo</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          value={booking.clientName}
                          onChange={e => setBooking(prev => ({ ...prev, clientName: e.target.value }))}
                          className="pl-10 h-12 bg-background border-border focus-visible:ring-primary"
                          placeholder="Juan Pérez"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="uppercase tracking-wider text-xs">Teléfono / WhatsApp</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          value={booking.clientPhone}
                          onChange={e => setBooking(prev => ({ ...prev, clientPhone: e.target.value }))}
                          className="pl-10 h-12 bg-background border-border focus-visible:ring-primary"
                          placeholder="+54 11 1234-5678"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="uppercase tracking-wider text-xs">Notas (opcional)</Label>
                      <Textarea
                        value={booking.notes}
                        onChange={e => setBooking(prev => ({ ...prev, notes: e.target.value }))}
                        className="min-h-[90px] bg-background border-border focus-visible:ring-primary resize-none"
                        placeholder="Alguna aclaración o preferencia..."
                      />
                    </div>
                  </div>

                  <div className="mt-8 pt-6 border-t border-border">
                    <Button
                      size="lg"
                      onClick={handleSubmit}
                      disabled={createAppointment.isPending || !booking.clientName || !booking.clientPhone}
                      className="w-full h-14 text-lg font-bold tracking-widest uppercase relative overflow-hidden group"
                    >
                      {createAppointment.isPending ? (
                        <Loader2 className="w-6 h-6 animate-spin" />
                      ) : (
                        <>
                          <span className="relative z-10">Confirmar turno</span>
                          <div className="absolute inset-0 bg-primary-foreground/10 translate-y-[100%] group-hover:translate-y-0 transition-transform duration-300" />
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {booking.step === 5 && (
          <div className="animate-in zoom-in-95 duration-500 max-w-md mx-auto w-full text-center mt-12">
            <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-8 border-2 border-primary">
              <CheckCircle2 className="w-12 h-12 text-primary" />
            </div>
            <h2 className="text-4xl font-black mb-4 uppercase tracking-tight">¡Turno confirmado!</h2>
            <p className="text-muted-foreground text-lg mb-8 leading-relaxed">
              Tu turno con <strong className="text-foreground">{selectedBarber?.name}</strong> está agendado para el{" "}
              <strong className="text-foreground capitalize">
                {booking.date && format(booking.date, "EEEE d 'de' MMMM", { locale: es })}
              </strong>{" "}
              a las <strong className="text-foreground">{booking.timeSlot}</strong>.
            </p>
            <div className="p-6 bg-secondary/50 rounded-lg border border-border mb-8">
              <p className="text-sm text-muted-foreground">Te esperamos, <strong className="text-foreground">{booking.clientName.split(' ')[0]}</strong>.</p>
            </div>
            <Button
              variant="outline"
              onClick={() => setBooking({ step: 1, clientName: "", clientPhone: "", notes: "" })}
              className="font-bold tracking-widest uppercase"
            >
              Reservar otro turno
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
