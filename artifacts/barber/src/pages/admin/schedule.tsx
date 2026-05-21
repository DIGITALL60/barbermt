import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Loader2, Save, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const API_BASE = import.meta.env.VITE_API_URL || "";

const DAYS = [
  { dow: 0, label: "Domingo" },
  { dow: 1, label: "Lunes" },
  { dow: 2, label: "Martes" },
  { dow: 3, label: "Miércoles" },
  { dow: 4, label: "Jueves" },
  { dow: 5, label: "Viernes" },
  { dow: 6, label: "Sábado" },
];

const HOURS = Array.from({ length: 24 }, (_, i) => i);

type DaySchedule = {
  dayOfWeek: number;
  enabled: boolean;
  startHour: number;
  endHour: number;
};

function HourSelect({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-muted-foreground">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="w-24 bg-secondary border border-border text-foreground rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
      >
        {HOURS.map((h) => (
          <option key={h} value={h}>
            {String(h).padStart(2, "0")}:00
          </option>
        ))}
      </select>
    </div>
  );
}

export default function SchedulePage() {
  const [schedule, setSchedule] = useState<DaySchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<number | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchSchedule();
  }, []);

  async function fetchSchedule() {
    try {
      const res = await fetch(`${API_BASE}/api/schedule`);
      if (!res.ok) throw new Error("Error al cargar");
      const data: DaySchedule[] = await res.json();

      // Si la tabla está vacía, inicializamos con valores por defecto
      const filled = DAYS.map((d) => {
        const found = data.find((r) => r.dayOfWeek === d.dow);
        return found ?? {
          dayOfWeek: d.dow,
          enabled: d.dow !== 0, // Domingo deshabilitado por defecto
          startHour: 9,
          endHour: 20,
        };
      });
      setSchedule(filled);
    } catch {
      toast({ title: "Error al cargar horarios", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  function updateDay(dayOfWeek: number, changes: Partial<DaySchedule>) {
    setSchedule((prev) =>
      prev.map((d) => (d.dayOfWeek === dayOfWeek ? { ...d, ...changes } : d))
    );
  }

  async function saveDay(dayOfWeek: number) {
    const day = schedule.find((d) => d.dayOfWeek === dayOfWeek);
    if (!day) return;
    if (day.startHour >= day.endHour) {
      toast({ title: "El horario de inicio debe ser anterior al de cierre", variant: "destructive" });
      return;
    }
    setSaving(dayOfWeek);
    try {
      const res = await fetch(`${API_BASE}/api/schedule/${dayOfWeek}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: day.enabled,
          startHour: day.startHour,
          endHour: day.endHour,
        }),
      });
      if (!res.ok) throw new Error();
      toast({ title: `${DAYS.find((d) => d.dow === dayOfWeek)?.label} guardado ✓` });
    } catch {
      toast({ title: "Error al guardar", variant: "destructive" });
    } finally {
      setSaving(null);
    }
  }

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-3xl font-bold">Disponibilidad</h1>
          <p className="text-muted-foreground mt-1">
            Configurá los días y horarios de atención
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-3">
            {DAYS.map((d) => {
              const day = schedule.find((s) => s.dayOfWeek === d.dow);
              if (!day) return null;
              const isSaving = saving === d.dow;

              return (
                <Card key={d.dow} className={`transition-opacity ${!day.enabled ? "opacity-60" : ""}`}>
                  <CardContent className="p-5">
                    <div className="flex items-center gap-4 flex-wrap">
                      <div className="flex items-center gap-3 w-36 shrink-0">
                        <Switch
                          checked={day.enabled}
                          onCheckedChange={(v) => updateDay(d.dow, { enabled: v })}
                        />
                        <span className="font-semibold text-sm">{d.label}</span>
                      </div>

                      {day.enabled ? (
                        <div className="flex items-end gap-3 flex-1 flex-wrap">
                          <HourSelect
                            label="Apertura"
                            value={day.startHour}
                            onChange={(v) => updateDay(d.dow, { startHour: v })}
                          />
                          <div className="flex items-center pb-2 text-muted-foreground text-sm">—</div>
                          <HourSelect
                            label="Cierre"
                            value={day.endHour}
                            onChange={(v) => updateDay(d.dow, { endHour: v })}
                          />
                          <div className="ml-auto flex items-end">
                            <Button
                              size="sm"
                              onClick={() => saveDay(d.dow)}
                              disabled={isSaving}
                              className="gap-1.5"
                            >
                              {isSaving ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Save className="w-3.5 h-3.5" />
                              )}
                              Guardar
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 flex-1 justify-between">
                          <span className="text-sm text-muted-foreground italic">Cerrado</span>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => saveDay(d.dow)}
                            disabled={isSaving}
                            className="gap-1.5"
                          >
                            {isSaving ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Save className="w-3.5 h-3.5" />
                            )}
                            Guardar
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4 flex items-start gap-3">
            <Clock className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <p className="text-sm text-muted-foreground">
              Los cambios se aplican inmediatamente al calendario de reservas. Los turnos ya agendados no se modifican automáticamente.
            </p>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
