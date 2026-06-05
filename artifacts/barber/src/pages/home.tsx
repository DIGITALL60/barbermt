import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { useListServices, useListBarbers, useGetAvailability, useCreateAppointment, getGetAvailabilityQueryKey } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Clock, ArrowRight, ArrowLeft, CheckCircle2, User, Calendar as CalendarIcon, Phone, Loader2, Instagram, Coffee, Sparkles } from "lucide-react";
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

// Normaliza cualquier respuesta de la API a un array
function toArray<T>(data: unknown): T[] {
  if (!data) return [];
  if (Array.isArray(data)) return data as T[];
  const obj = data as Record<string, unknown>;
  for (const key of ["data", "items", "services", "barbers", "results"]) {
    if (Array.isArray(obj[key])) return obj[key] as T[];
  }
  return [];
}

function LogoMT({ className = "h-10 w-10" }: { className?: string }) {
  return (
    <img src="/logo-mt.svg" alt="Barber M.T" className={className} />
  );
}

export default function HomePage() {
  const container = useRef<HTMLDivElement>(null);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [booking, setBooking] = useState<BookingState>({
    step: 0,
    clientName: "",
    clientPhone: "",
    notes: ""
  });

  useGSAP(() => {
    // Hero Animations
    if (booking.step === 0) {
      gsap.from(".hero-text", {
        y: 50,
        opacity: 0,
        duration: 1,
        stagger: 0.15,
        ease: "power3.out",
        delay: 0.2
      });
      gsap.fromTo(".hero-bg", 
        { scale: 1.1 }, 
        { scale: 1.05, duration: 10, ease: "none" }
      );
    } else {
      // Flow Animations
      gsap.from(".flow-container", {
        y: 30,
        opacity: 0,
        duration: 0.6,
        ease: "power2.out",
        clearProps: "all"
      });
      gsap.from(".flow-item", {
        y: 20,
        opacity: 0,
        duration: 0.5,
        stagger: 0.05,
        ease: "power2.out",
        delay: 0.1,
        clearProps: "all"
      });
    }
  }, { dependencies: [booking.step], scope: container });

  const { data: servicesRaw, isLoading: isLoadingServices } = useListServices({ activeOnly: true });
  const { data: barbersRaw, isLoading: isLoadingBarbers } = useListBarbers({ activeOnly: true });

  // Siempre arrays, sin importar qué devuelva la API
  const services = toArray<{ id: number; name: string; price: number | string; durationMinutes: number }>(servicesRaw);
  const barbers = toArray<{ id: number; name: string; bio?: string; photoUrl?: string }>(barbersRaw);

  const API_BASE = import.meta.env.VITE_API_URL || "";
  const { data: schedule } = useQuery<{ dayOfWeek: number; enabled: boolean; startHour: number; endHour: number }[]>({
    queryKey: ["schedule"],
    queryFn: () => fetch(`${API_BASE}/api/schedule`).then(r => r.json()).then(d => Array.isArray(d) ? d : (d?.data ?? [])),
  });

  const disabledDays = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) return true;
    const dayConfig = schedule?.find(s => s.dayOfWeek === date.getDay());
    if (!dayConfig) return date.getDay() === 0;
    return !dayConfig.enabled;
  };

  const formattedDate = booking.date ? format(booking.date, "yyyy-MM-dd") : "";
  const { data: availability, isLoading: isLoadingAvailability } = useGetAvailability(
    { barberId: booking.barberId!, date: formattedDate, serviceId: booking.serviceId },
    { query: { enabled: !!booking.barberId && !!booking.date, queryKey: getGetAvailabilityQueryKey({ barberId: booking.barberId!, date: formattedDate, serviceId: booking.serviceId }) } }
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
      onSuccess: () => setBooking(prev => ({ ...prev, step: 5 })),
      onError: () => toast({ title: "No se pudo reservar el turno. Intentá de nuevo.", variant: "destructive" })
    });
  };

  const selectedService = services.find(s => s.id === booking.serviceId);
  const selectedBarber = barbers.find(b => b.id === booking.barberId);
  const isInFlow = booking.step >= 1 && booking.step <= 4;

  return (
    <div ref={container} className="min-h-[100dvh] bg-background text-foreground flex flex-col selection:bg-primary selection:text-background relative">
      {/* Noise Texture Overlay */}
      <div className="pointer-events-none fixed inset-0 z-50 opacity-[0.03] mix-blend-overlay" style={{ backgroundImage: "url('data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E')" }}></div>

      {/* Header */}
      <header className="py-4 px-6 border-b border-border/50 bg-background/70 backdrop-blur-xl sticky top-0 z-20">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/admin")}
              className="cursor-default focus:outline-none"
              tabIndex={-1}
              aria-hidden="true"
            >
              <LogoMT className="h-9 w-9" />
            </button>
            <div>
              <span className="text-lg font-black uppercase tracking-wider text-foreground leading-none block">Barber M.T</span>
              <span className="text-[10px] text-muted-foreground tracking-widest uppercase">@mtbarbervm</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isInFlow && (
              <span className="text-xs font-medium text-muted-foreground tracking-widest uppercase hidden sm:block">
                Paso {booking.step} de 4
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

      {/* ── LANDING ── */}
      {booking.step === 0 && (
        <div className="flex flex-col">

          {/* Hero foto de la pelu */}
          <div className="relative w-full h-[80vh] overflow-hidden">
            <img
              src="/pelu.jpeg"
              alt="Barber M.T – El local"
              className="hero-bg w-full h-full object-cover object-center scale-105 opacity-60"
              style={{ filter: "contrast(1.2) grayscale(0.2)" }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
            <div className="absolute inset-0 bg-background/20" />

            {/* Texto hero */}
            <div className="absolute bottom-0 left-0 right-0 p-8 md:p-14 z-10">
              <div className="max-w-4xl mx-auto w-full">
                <p className="hero-text text-primary text-xs md:text-sm font-bold uppercase tracking-[0.4em] mb-4 text-glow">Barber M.T · Villa Maria/Cba</p>
                <h2 className="hero-text text-6xl md:text-8xl font-display font-black uppercase leading-[0.9] tracking-tighter mb-6 text-foreground text-shadow-xl">
                  Para un buen día,<br /><span className="text-primary">un buen corte.</span>
                </h2>
                <p className="hero-text text-muted-foreground text-lg md:text-xl max-w-lg leading-relaxed font-light">
                  Reservá tu turno online en segundos. Sin esperas, sin llamadas.
                </p>
              </div>
            </div>
          </div>

          {/* CTA + detalles */}
          <div className="max-w-5xl mx-auto w-full px-6 md:px-8 py-10 space-y-10">

            <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">
              <Button
                size="lg"
                onClick={() => setBooking(prev => ({ ...prev, step: 1 }))}
                className="hero-text glass-button text-primary-foreground bg-primary hover:bg-primary/90 hover:scale-105 font-black tracking-[0.2em] uppercase text-sm md:text-base px-12 h-16 rounded-none shadow-[0_0_40px_rgba(234,179,8,0.2)]"
              >
                Reservar turno <ArrowRight className="w-5 h-5 ml-3" />
              </Button>
              <div className="flex flex-col gap-2">
                <a
                  href="https://wa.me/5493534095505"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                  Bot de Reservas
                </a>
                <a
                  href="https://wa.me/5493534810359"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                  Atención Barbero (MT)
                </a>
              </div>
            </div>

            <div className="border-t border-border" />

            {/* Foto del barbero + presentación */}
            <div className="flex flex-col sm:flex-row gap-8 items-start">
              <div className="relative shrink-0">
                <img
                  src="/barbero.png"
                  alt="Matías T."
                  className="w-36 h-36 object-cover object-top rounded-xl border-2 border-primary/30"
                />
              </div>
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground uppercase tracking-[0.25em] font-semibold">Tu barbero</p>
                <h3 className="text-2xl font-black">Matías T.</h3>
                <p className="text-muted-foreground leading-relaxed max-w-md">
                  Especializado en degradados, perfiles y estilos modernos. Cada corte es un detalle. Cada cliente, una historia.
                </p>
                <a
                  href="https://instagram.com/mtbarbervm"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                >
                  <Instagram className="w-4 h-4" /> @mtbarbervm
                </a>
              </div>
            </div>

            <div className="border-t border-border" />

            {/* Reel destacado */}
            <div className="flex flex-col md:flex-row gap-8 items-center glass-panel p-6 md:p-8 rounded-2xl overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent opacity-20 pointer-events-none" />
              <div className="w-full max-w-[320px] shrink-0 mx-auto z-10 relative group">
                <a href="https://www.instagram.com/reel/DZN5Re1x2Jl/" target="_blank" rel="noopener noreferrer" className="block relative rounded-xl overflow-hidden shadow-2xl border border-white/10">
                  <video
                    src="/reel.mp4"
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full aspect-[9/16] bg-black object-cover pointer-events-none"
                  />
                  {/* Capa de interacción al hover para indicar que es un enlace */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                    <div className="bg-background/80 backdrop-blur-md p-4 rounded-full flex flex-col items-center gap-1 border border-white/10 transform scale-90 group-hover:scale-100 transition-transform duration-300">
                      <Instagram className="w-6 h-6 text-primary" />
                      <span className="text-[10px] uppercase font-bold tracking-widest">Ver en IG</span>
                    </div>
                  </div>
                </a>
              </div>
              <div className="space-y-4 text-center md:text-left z-10">
                <p className="text-primary text-xs font-bold uppercase tracking-[0.3em] text-glow">En acción</p>
                <h3 className="text-4xl md:text-5xl font-display font-black uppercase leading-[0.9] tracking-tighter">Nuestro Estilo</h3>
                <p className="text-muted-foreground text-lg leading-relaxed max-w-md mx-auto md:mx-0">
                  Cortes precisos, atención al detalle y el mejor ambiente para que disfrutes tu momento.
                </p>
              </div>
            </div>

            <div className="border-t border-border" />

            {/* Servicios */}
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-[0.25em] font-semibold mb-5">Servicios</p>
              {isLoadingServices ? (
                <div className="flex gap-4">
                  {[...Array(2)].map((_, i) => (
                    <div key={i} className="h-24 w-64 bg-muted/40 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
                  {services.map(service => (
                    <button
                      key={service.id}
                      onClick={() => setBooking(prev => ({ ...prev, serviceId: service.id, step: 2 }))}
                      className="flow-item group text-left p-6 rounded-xl glass-panel hover:border-primary/60 hover:bg-primary/5 hover:-translate-y-1 hover:shadow-[0_10px_40px_-10px_rgba(234,179,8,0.15)] transition-all duration-400"
                    >
                      <div className="flex justify-between items-start gap-2 mb-4">
                        <span className="font-display font-bold text-2xl group-hover:text-primary transition-colors leading-tight">{service.name}</span>
                        <span className="text-primary font-black text-xl shrink-0">{formatPrice(service.price)}</span>
                      </div>
                      <div className="flex items-center gap-3 text-muted-foreground text-xs">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {service.durationMinutes} min</span>
                        <span className="flex items-center gap-1"><Sparkles className="w-3 h-3" /> Perfilado + cera</span>
                        <span className="flex items-center gap-1"><Coffee className="w-3 h-3" /> Cafecito</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-border pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-3">
                <LogoMT className="h-7 w-7 opacity-60" />
                <span>© 2026 Barber M.T - "Creado por <a href="https://www.digitall.baby" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors underline decoration-primary/50 underline-offset-4 font-bold">DIGITALL</a>"</span>
              </div>
              <div className="flex items-center gap-4">
                <a href="https://instagram.com/mtbarbervm" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:text-primary transition-colors">
                  <Instagram className="w-3.5 h-3.5" /> @mtbarbervm
                </a>
                <div className="flex flex-col gap-2">
                  <a href="https://wa.me/5493534095505" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:text-primary transition-colors">
                    <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                    Bot de Reservas
                  </a>
                  <a href="https://wa.me/5493534810359" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:text-primary transition-colors">
                    <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                    Atención Barbero (MT)
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── FLUJO DE RESERVA ── */}
      {booking.step >= 1 && booking.step <= 5 && (
        <main className="flex-1 flex flex-col w-full max-w-4xl mx-auto p-4 md:p-8">

          {/* Paso 1 – Servicio */}
          {booking.step === 1 && (
            <div className="flow-container max-w-2xl mx-auto w-full">
              <button onClick={() => setBooking(prev => ({ ...prev, step: 0 }))} className="flex items-center text-muted-foreground hover:text-primary mb-6 transition-colors font-medium tracking-wide uppercase text-sm">
                <ArrowLeft className="w-4 h-4 mr-2" /> Volver
              </button>
              <h2 className="text-3xl font-display font-black mb-2 text-center uppercase tracking-wider">Elegí tu servicio</h2>
              <p className="text-center text-muted-foreground mb-8 text-sm">Todos los servicios incluyen perfilado, cera y cafecito</p>
              {isLoadingServices ? (
                <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
              ) : (
                <div className="grid gap-4">
                  {services.map(service => (
                    <button
                      key={service.id}
                      className={`flow-item text-left group relative overflow-hidden rounded-xl border transition-all duration-400 hover:-translate-y-1 hover:shadow-[0_10px_40px_-10px_rgba(234,179,8,0.2)]
                        ${booking.serviceId === service.id
                          ? 'border-primary ring-1 ring-primary bg-primary/10 glass-panel'
                          : 'glass-panel hover:border-primary/50'}`}
                      onClick={() => {
                        setBooking(prev => ({ ...prev, serviceId: service.id }));
                        setTimeout(handleNext, 300);
                      }}
                    >
                      <div className="p-6 flex items-center justify-between z-10 relative">
                        <div>
                          <h3 className="text-xl font-bold mb-2">{service.name}</h3>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {service.durationMinutes} min</span>
                            <span className="flex items-center gap-1"><Sparkles className="w-3 h-3" /> Perfilado + cera incluido</span>
                            <span className="flex items-center gap-1"><Coffee className="w-3 h-3" /> Cafecito</span>
                          </div>
                        </div>
                        <div className="text-3xl font-black text-primary shrink-0 ml-4">{formatPrice(service.price)}</div>
                      </div>
                      {booking.serviceId === service.id && <div className="absolute inset-y-0 right-0 w-1 bg-primary" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Paso 2 – Barbero */}
          {booking.step === 2 && (
            <div className="flow-container max-w-2xl mx-auto w-full">
              <button onClick={handleBack} className="flex items-center text-muted-foreground hover:text-primary mb-6 transition-colors font-medium tracking-wide uppercase text-sm">
                <ArrowLeft className="w-4 h-4 mr-2" /> Volver
              </button>
              <h2 className="text-3xl font-display font-black mb-2 text-center uppercase tracking-wider">Tu barbero</h2>
              <p className="text-center text-muted-foreground mb-8 text-sm">¿Con quién querés atenderte?</p>
              {isLoadingBarbers ? (
                <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
              ) : (
                <div className="grid gap-4">
                  {barbers.map(barber => (
                    <button
                      key={barber.id}
                      className={`flow-item text-left group relative overflow-hidden rounded-xl border transition-all duration-400 hover:-translate-y-1 hover:shadow-[0_10px_40px_-10px_rgba(234,179,8,0.2)]
                        ${booking.barberId === barber.id
                          ? 'border-primary ring-1 ring-primary bg-primary/10 glass-panel'
                          : 'glass-panel hover:border-primary/50'}`}
                      onClick={() => {
                        setBooking(prev => ({ ...prev, barberId: barber.id }));
                        setTimeout(handleNext, 300);
                      }}
                    >
                      <div className="p-6 flex items-center gap-5 z-10 relative">
                        <img
                          src={barber.photoUrl ?? "/barbero.png"}
                          alt={barber.name}
                          className="w-16 h-16 rounded-full object-cover object-top border-2 border-border shrink-0"
                        />
                        <div>
                          <h3 className="text-xl font-bold mb-1">{barber.name}</h3>
                          <p className="text-muted-foreground text-sm">{barber.bio}</p>
                        </div>
                      </div>
                      {booking.barberId === barber.id && <div className="absolute inset-y-0 right-0 w-1 bg-primary" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Paso 3 – Fecha y horario */}
          {booking.step === 3 && (
            <div className="flow-container w-full max-w-3xl mx-auto">
              <button onClick={handleBack} className="flex items-center text-muted-foreground hover:text-primary mb-6 transition-colors font-medium tracking-wide uppercase text-sm">
                <ArrowLeft className="w-4 h-4 mr-2" /> Volver
              </button>
              <h2 className="text-3xl font-display font-black mb-2 text-center uppercase tracking-wider">Elegí fecha y horario</h2>
              <p className="text-center text-muted-foreground mb-8 text-sm">Seleccioná el día y el horario disponible</p>

              <div className="grid md:grid-cols-2 gap-8 items-start">
                <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                  <CardContent className="p-4 flex justify-center">
                    <Calendar
                      mode="single"
                      selected={booking.date}
                      onSelect={(d) => setBooking(prev => ({ ...prev, date: d, timeSlot: undefined }))}
                      disabled={disabledDays}
                      locale={es}
                      className="rounded-md"
                    />
                  </CardContent>
                </Card>

                <div className="bg-card/50 p-6 rounded-xl border border-border/50 min-h-[350px]">
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
                            className={`py-3 px-2 rounded-lg text-sm font-bold tracking-wider transition-all
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
                      <p>Sin horarios disponibles.</p>
                      <p className="text-sm mt-1">Probá con otro día.</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-8 flex justify-end">
                <Button size="lg" disabled={!booking.timeSlot} onClick={handleNext} className="w-full md:w-auto font-bold tracking-widest uppercase px-8">
                  Continuar <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Paso 4 – Confirmar */}
          {booking.step === 4 && (
            <div className="flow-container max-w-4xl mx-auto w-full">
              <button onClick={handleBack} className="flex items-center text-muted-foreground hover:text-primary mb-6 transition-colors font-medium tracking-wide uppercase text-sm">
                <ArrowLeft className="w-4 h-4 mr-2" /> Volver
              </button>
              <h2 className="text-3xl font-display font-black mb-2 text-center uppercase tracking-wider">Confirmá tu turno</h2>
              <p className="text-center text-muted-foreground mb-8 text-sm">Revisá los detalles e ingresá tus datos</p>

              <div className="grid md:grid-cols-5 gap-8">
                <div className="md:col-span-2">
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

                <div className="md:col-span-3">
                  <div className="bg-card p-6 md:p-8 rounded-xl border border-border">
                    <h3 className="text-xl font-bold mb-6 uppercase tracking-wider">Tus datos</h3>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="uppercase tracking-wider text-xs">Nombre completo</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input value={booking.clientName} onChange={e => setBooking(prev => ({ ...prev, clientName: e.target.value }))} className="pl-10 h-12 bg-background border-border focus-visible:ring-primary" placeholder="Juan Pérez" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="uppercase tracking-wider text-xs">Teléfono / WhatsApp</Label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input value={booking.clientPhone} onChange={e => setBooking(prev => ({ ...prev, clientPhone: e.target.value }))} className="pl-10 h-12 bg-background border-border focus-visible:ring-primary" placeholder="+54 11 1234-5678" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="uppercase tracking-wider text-xs">Notas (opcional)</Label>
                        <Textarea value={booking.notes} onChange={e => setBooking(prev => ({ ...prev, notes: e.target.value }))} className="min-h-[80px] bg-background border-border focus-visible:ring-primary resize-none" placeholder="Alguna aclaración o preferencia..." />
                      </div>
                    </div>
                    <div className="mt-8 pt-6 border-t border-border">
                      <Button size="lg" onClick={handleSubmit} disabled={createAppointment.isPending || !booking.clientName || !booking.clientPhone} className="w-full h-14 text-lg font-bold tracking-widest uppercase relative overflow-hidden group">
                        {createAppointment.isPending ? <Loader2 className="w-6 h-6 animate-spin" /> : (
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

          {/* Paso 5 – Confirmación */}
          {booking.step === 5 && (
            <div className="flow-container max-w-md mx-auto w-full text-center mt-12">
              <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-8 border-2 border-primary">
                <CheckCircle2 className="w-12 h-12 text-primary" />
              </div>
              <h2 className="text-4xl font-display font-black mb-4 uppercase tracking-tight">¡Turno confirmado!</h2>
              <p className="text-muted-foreground text-lg mb-8 leading-relaxed">
                Tu turno con <strong className="text-foreground">{selectedBarber?.name}</strong> está agendado para el{" "}
                <strong className="text-foreground capitalize">
                  {booking.date && format(booking.date, "EEEE d 'de' MMMM", { locale: es })}
                </strong>{" "}
                a las <strong className="text-foreground">{booking.timeSlot}</strong>.
              </p>
              <div className="p-6 bg-secondary/50 rounded-xl border border-border mb-8 space-y-2">
                <p className="text-sm text-muted-foreground">Te esperamos, <strong className="text-foreground">{booking.clientName.split(' ')[0]}</strong>. 💈</p>
                <p className="text-xs text-muted-foreground">Para cambios escribinos por WhatsApp.</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button variant="outline" onClick={() => setBooking({ step: 0, clientName: "", clientPhone: "", notes: "" })} className="font-bold tracking-widest uppercase">
                  Volver al inicio
                </Button>
                <a href="https://wa.me/5493534095505" target="_blank" rel="noopener noreferrer">
                  <Button variant="ghost" className="font-bold tracking-widest uppercase w-full sm:w-auto">
                    Contactar Bot
                  </Button>
                </a>
                <a href="https://wa.me/5493534810359" target="_blank" rel="noopener noreferrer">
                  <Button variant="ghost" className="font-bold tracking-widest uppercase w-full sm:w-auto">
                    Contactar Barbero
                  </Button>
                </a>
              </div>
            </div>
          )}
        </main>
      )}
    </div>
  );
}
