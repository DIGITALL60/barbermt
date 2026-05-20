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
import { Scissors, Clock, ArrowRight, ArrowLeft, CheckCircle2, User, Calendar as CalendarIcon, Phone, Loader2, MapPin, Instagram } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const HERO_IMAGE = "https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=1600&q=80";

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
    step: 0,
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

  const isInFlow = booking.step >= 1 && booking.step <= 4;
  const stepLabel = isInFlow ? `Paso ${booking.step} de 4` : null;

  return (
    <div className="min-h-[100dvh] bg-background text-foreground flex flex-col selection:bg-primary selection:text-background">

      {/* Header */}
      <header className="py-5 px-8 border-b border-border bg-card/60 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-black uppercase tracking-widest text-primary flex items-center gap-2">
            <Scissors className="w-5 h-5" /> New King Barber
          </h1>
          <div className="flex items-center gap-4">
            {stepLabel && (
              <span className="text-sm font-medium text-muted-foreground tracking-widest uppercase">
                {stepLabel}
              </span>
            )}
            {booking.step === 0 && (
              <Button
                size="sm"
                onClick={() => setBooking(prev => ({ ...prev, step: 1 }))}
                className="font-bold tracking-wider uppercase text-xs px-5"
              >
                Reservar turno
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* HERO — solo visible en step 0 */}
      {booking.step === 0 && (
        <div className="flex flex-col">
          {/* Imagen principal */}
          <div className="relative w-full h-[70vh] overflow-hidden">
            <img
              src={HERO_IMAGE}
              alt="New King Barber"
              className="w-full h-full object-cover object-center"
            />
            {/* Overlay degradado */}
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-background/30 to-transparent" />

            {/* Texto sobre la imagen */}
            <div className="absolute bottom-0 left-0 right-0 p-8 md:p-14 max-w-3xl">
              <p className="text-primary text-xs font-bold uppercase tracking-[0.3em] mb-3">Buenos Aires, Argentina</p>
              <h2 className="text-5xl md:text-7xl font-black uppercase leading-none tracking-tight mb-4">
                Tu mejor<br />versión.
              </h2>
              <p className="text-muted-foreground text-lg max-w-md leading-relaxed">
                Cortes premium, atención personalizada. Reservá tu turno online en segundos.
              </p>
            </div>
          </div>

          {/* CTA y servicios destacados */}
          <div className="max-w-5xl mx-auto w-full px-6 md:px-8 py-12 space-y-12">
            {/* Botón principal */}
            <div className="flex flex-col sm:flex-row gap-4 items-start">
              <Button
                size="lg"
                onClick={() => setBooking(prev => ({ ...prev, step: 1 }))}
                className="font-black tracking-widest uppercase text-base px-10 h-14"
              >
                Reservar turno <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <div className="flex items-center gap-2 text-muted-foreground text-sm self-center">
                <MapPin className="w-4 h-4 text-primary" />
                <span>Buenos Aires · Lunes a Sábado · 9:00 – 20:00</span>
              </div>
            </div>

            {/* Separador */}
            <div className="border-t border-border" />

            {/* Servicios preview */}
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-[0.25em] font-semibold mb-6">Nuestros servicios</p>
              {isLoadingServices ? (
                <div className="flex gap-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-20 w-48 bg-muted/40 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {services?.map(service => (
                    <button
                      key={service.id}
                      onClick={() => {
                        setBooking(prev => ({ ...prev, serviceId: service.id, step: 2 }));
                      }}
                      className="group text-left p-5 rounded-lg border border-border bg-card hover:border-primary/60 hover:bg-primary/5 transition-all duration-200"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <span className="font-bold text-base group-hover:text-primary transition-colors">{service.name}</span>
                        <span className="text-primary font-black text-sm shrink-0">{formatPrice(service.price)}</span>
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground text-xs mt-2">
                        <Clock className="w-3 h-3" /> {service.durationMinutes} min
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-border pt-6 flex items-center justify-between text-xs text-muted-foreground">
              <span>© 2025 New King Barber</span>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 hover:text-primary transition-colors"
              >
                <Instagram className="w-3.5 h-3.5" /> @newkingbarber
              </a>
            </div>
          </div>
        </div>
      )}

      {/* FLUJO DE RESERVA */}
      {booking.step >= 1 && booking.step <= 5 && (
        <main className="flex-1 flex flex-col w-full max-w-4xl mx-auto p-4 md:p-8">

          {booking.step === 1 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-2xl mx-auto w-full">
              <button onClick={() => setBooking(prev => ({ ...prev, step: 0 }))} className="flex items-center text-muted-foreground hover:text-primary mb-6 transition-colors font-medium tracking-wide uppercase text-sm">
                <ArrowLeft className="w-4 h-4 mr-2" /> Volver
              </button>
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
                      <div className="p-6 flex items-center gap-5 z-10 relative">
                        <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center shrink-0 border border-border">
                          <Scissors className="w-6 h-6 text-primary opacity-70" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold mb-1">{barber.name}</h3>
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
                onClick={() => setBooking({ step: 0, clientName: "", clientPhone: "", notes: "" })}
                className="font-bold tracking-widest uppercase"
              >
                Volver al inicio
              </Button>
            </div>
          )}
        </main>
      )}
    </div>
  );
}
