import { useState } from "react";
import { useListServices, useListBarbers, useGetAvailability, useCreateAppointment } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { Scissors, Clock, ArrowRight, ArrowLeft, CheckCircle2, ChevronRight, User, Calendar as CalendarIcon, Phone } from "lucide-react";
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
      toast({ title: "Please fill in all required fields", variant: "destructive" });
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
        toast({ title: "Failed to book appointment. Please try again.", variant: "destructive" });
      }
    });
  };

  const selectedService = services?.find(s => s.id === booking.serviceId);
  const selectedBarber = barbers?.find(b => b.id === booking.barberId);

  return (
    <div className="min-h-[100dvh] bg-background text-foreground flex flex-col selection:bg-primary selection:text-background">
      {/* Header */}
      <header className="py-6 px-8 border-b border-border bg-card/50 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-black uppercase tracking-widest text-primary flex items-center gap-2">
            <Scissors className="w-6 h-6" /> King Barber
          </h1>
          {booking.step < 5 && (
            <div className="text-sm font-medium text-muted-foreground tracking-widest uppercase">
              Step {booking.step} / 4
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col w-full max-w-4xl mx-auto p-4 md:p-8">
        
        {booking.step === 1 && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-2xl mx-auto w-full">
            <h2 className="text-3xl font-bold mb-8 text-center uppercase tracking-wider">Select a Service</h2>
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
                      <div className="text-2xl font-black text-primary">${service.price}</div>
                      <div className="flex items-center justify-end text-sm text-muted-foreground mt-1 gap-1">
                        <Clock className="w-3.5 h-3.5" /> {service.durationMinutes}m
                      </div>
                    </div>
                  </div>
                  {booking.serviceId === service.id && (
                    <div className="absolute inset-y-0 right-0 w-1 bg-primary" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {booking.step === 2 && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-2xl mx-auto w-full">
            <button onClick={handleBack} className="flex items-center text-muted-foreground hover:text-primary mb-6 transition-colors font-medium tracking-wide uppercase text-sm">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </button>
            <h2 className="text-3xl font-bold mb-8 text-center uppercase tracking-wider">Choose your Barber</h2>
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
                    <div className="w-20 h-20 rounded-full overflow-hidden bg-secondary shrink-0 border-2 border-transparent group-hover:border-primary/20 transition-colors">
                      {barber.photoUrl ? (
                        <img src={barber.photoUrl} alt={barber.name} className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-8 h-8 m-auto text-muted-foreground mt-6" />
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
          </div>
        )}

        {booking.step === 3 && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 w-full max-w-3xl mx-auto">
            <button onClick={handleBack} className="flex items-center text-muted-foreground hover:text-primary mb-6 transition-colors font-medium tracking-wide uppercase text-sm">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </button>
            <h2 className="text-3xl font-bold mb-8 text-center uppercase tracking-wider">Pick Date & Time</h2>
            
            <div className="grid md:grid-cols-2 gap-8 items-start">
              <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                <CardContent className="p-4 flex justify-center">
                  <Calendar
                    mode="single"
                    selected={booking.date}
                    onSelect={(d) => setBooking(prev => ({ ...prev, date: d, timeSlot: undefined }))}
                    disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))}
                    className="rounded-md"
                  />
                </CardContent>
              </Card>

              <div className="bg-card/50 p-6 rounded-lg border border-border/50 min-h-[350px]">
                {!booking.date ? (
                  <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                    <CalendarIcon className="w-12 h-12 mb-4 opacity-20" />
                    <p>Select a date first</p>
                  </div>
                ) : isLoadingAvailability ? (
                  <div className="h-full flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : availability?.slots.length ? (
                  <div className="grid grid-cols-2 gap-3 animate-in fade-in duration-300">
                    {availability.slots.map(slot => (
                      <button
                        key={slot.time}
                        disabled={!slot.available}
                        onClick={() => setBooking(prev => ({ ...prev, timeSlot: slot.time }))}
                        className={`py-3 px-4 rounded-md text-sm font-bold tracking-wider transition-all
                          ${!slot.available 
                            ? 'opacity-30 cursor-not-allowed bg-secondary/50 line-through' 
                            : booking.timeSlot === slot.time
                              ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-105'
                              : 'bg-secondary hover:bg-secondary/80 text-foreground hover:text-primary'
                          }`}
                      >
                        {slot.time}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                    <p>No availability on this date.</p>
                    <p className="text-sm mt-1">Please select another day.</p>
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
                Continue <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {booking.step === 4 && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto w-full">
            <button onClick={handleBack} className="flex items-center text-muted-foreground hover:text-primary mb-6 transition-colors font-medium tracking-wide uppercase text-sm">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </button>
            <h2 className="text-3xl font-bold mb-8 text-center uppercase tracking-wider">Confirm Details</h2>
            
            <div className="grid md:grid-cols-5 gap-8">
              <div className="md:col-span-2 space-y-6">
                <Card className="bg-card border-primary/20">
                  <CardContent className="p-6 space-y-6">
                    <div className="pb-6 border-b border-border">
                      <div className="text-sm text-muted-foreground uppercase tracking-widest mb-1">Appointment</div>
                      <div className="text-xl font-bold">{booking.date && format(booking.date, "EEEE, MMMM do")}</div>
                      <div className="text-2xl font-black text-primary mt-1">{booking.timeSlot}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground uppercase tracking-widest mb-1">Service</div>
                      <div className="font-bold text-lg">{selectedService?.name}</div>
                      <div className="text-muted-foreground">${selectedService?.price} • {selectedService?.durationMinutes}m</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground uppercase tracking-widest mb-1">Barber</div>
                      <div className="font-bold text-lg">{selectedBarber?.name}</div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="md:col-span-3 space-y-6">
                <div className="bg-card p-6 md:p-8 rounded-lg border border-border">
                  <h3 className="text-xl font-bold mb-6 uppercase tracking-wider">Your Information</h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="uppercase tracking-wider text-xs">Full Name</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input 
                          value={booking.clientName}
                          onChange={e => setBooking(prev => ({ ...prev, clientName: e.target.value }))}
                          className="pl-10 h-12 bg-background border-border focus-visible:ring-primary"
                          placeholder="John Doe"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="uppercase tracking-wider text-xs">Phone Number</Label>
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
                      <Label className="uppercase tracking-wider text-xs">Notes (Optional)</Label>
                      <Textarea 
                        value={booking.notes}
                        onChange={e => setBooking(prev => ({ ...prev, notes: e.target.value }))}
                        className="min-h-[100px] bg-background border-border focus-visible:ring-primary resize-none"
                        placeholder="Any special requests?"
                      />
                    </div>
                  </div>

                  <div className="mt-8 pt-8 border-t border-border">
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
                          <span className="relative z-10">Confirm Booking</span>
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
            <h2 className="text-4xl font-black mb-4 uppercase tracking-tight">You're In.</h2>
            <p className="text-muted-foreground text-lg mb-8 leading-relaxed">
              Your appointment with <strong className="text-foreground">{selectedBarber?.name}</strong> is confirmed for <strong className="text-foreground">{booking.date && format(booking.date, "EEEE, MMMM do")}</strong> at <strong className="text-foreground">{booking.timeSlot}</strong>.
            </p>
            <div className="p-6 bg-secondary/50 rounded-lg border border-border mb-8">
              <p className="text-sm">We'll see you soon, {booking.clientName.split(' ')[0]}.</p>
            </div>
            <Button 
              variant="outline" 
              onClick={() => setBooking({ step: 1, clientName: "", clientPhone: "", notes: "" })}
              className="font-bold tracking-widest uppercase"
            >
              Book Another
            </Button>
          </div>
        )}

      </main>
    </div>
  );
}
