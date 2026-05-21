import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Loader2, Save, Clock, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const API_BASE = import.meta.env.VITE_API_URL || "";

const DAYS = [
  { dow: 0, label: "Domingo", short: "Dom" },
  { dow: 1, label: "Lunes", short: "Lun" },
  { dow: 2, label: "Martes", short: "Mar" },
  { dow: 3, label: "Miércoles", short: "Mié" },
  { dow: 4, label: "Jueves", short: "Jue" },
  { dow: 5, label: "Viernes", short: "Vie" },
  { dow: 6, label: "Sábado", short: "Sáb" },
];

const HOURS = Array.from({ length: 24 }, (_, i) => i);

type DaySchedule = {
  dayOfWeek: number;
  enabled: boolean;
  startHour: number;
  endHour: number;
};

function HourSelect({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  label: string;
}) {
  return (
    <div className="flex flex-col gap-1 flex-1">
      <label className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="w-full bg-background border border-border text-foreground rounded-lg px-3 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary appearance-none text-center"
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
      const filled = DAYS.map((d) => {
        const found = data.find((r) => r.dayOfWeek === d.dow);
        return (
          found ?? {
            dayOfWeek: d.dow,
            enabled: d.dow !== 0,
            startHour: 9,
            endHour: 20,
          }
        );
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
    if (day.enabled && day.startHour >= day.endHour) {
      toast({
        title: "El horario de apertura debe ser anterior al de cierre",
        variant: "destructive",
      });
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
      toast({
        title: `✓ ${DAYS.find((d) => d.dow === dayOfWeek)?.label} guardado`,
      });
    } catch {
      toast({ title: "Error al guardar", variant: "destructive" });
    } finally {
      setSaving(null);
    }
  }

  return (
    <AdminLayout>
      <div className="max-w-lg mx-auto space-y-5">
        {/* Header */}
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Disponibilidad</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Elegí qué días y horarios abrís la agenda
          </p>
        </div>

        {/* Aviso */}
        <div className="flex items-start gap-3 bg-primary/5 border border-primary/20 rounded-xl p-4">
          <Info className="w-4 h-4 text-primary mt-0.5 shrink-0" />
          <p className="text-sm text-muted-foreground leading-relaxed">
            Los cambios se aplican de inmediato. Los días desactivados no
            aparecen en el calendario de reservas.
          </p>
        </div>

        {/* Días */}
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-3">
            {DAYS.map((d) => {
              const day = schedule.find((s) => s.dayOfWeek === d.dow);
              if (!day) return null;
              const isSaving = saving === d.dow;

              return (
                <div
                  key={d.dow}
                  className={`rounded-xl border border-border bg-card transition-all ${
                    !day.enabled ? "opacity-55" : ""
                  }`}
                >
                  {/* Fila principal: toggle + nombre + botón */}
                  <div className="flex items-center gap-3 p-4">
                    <Switch
                      checked={day.enabled}
                      onCheckedChange={(v) => updateDay(d.dow, { enabled: v })}
                    />
                    <span className="font-semibold flex-1 text-base">
                      {d.label}
                    </span>
                    {!day.enabled ? (
                      <span className="text-sm text-muted-foreground italic mr-1">
                        Cerrado
                      </span>
                    ) : null}
                    <Button
                      size="sm"
                      variant={day.enabled ? "default" : "secondary"}
                      onClick={() => saveDay(d.dow)}
                      disabled={isSaving}
                      className="gap-1.5 shrink-0 h-9 px-3"
                    >
                      {isSaving ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Save className="w-3.5 h-3.5" />
                      )}
                      <span className="hidden sm:inline">Guardar</span>
                    </Button>
                  </div>

                  {/* Fila horarios — solo si está habilitado */}
                  {day.enabled && (
                    <div className="flex items-end gap-3 px-4 pb-4">
                      <HourSelect
                        label="Abre"
                        value={day.startHour}
                        onChange={(v) => updateDay(d.dow, { startHour: v })}
                      />
                      <div className="pb-2.5 text-muted-foreground font-bold text-lg">
                        →
                      </div>
                      <HourSelect
                        label="Cierra"
                        value={day.endHour}
                        onChange={(v) => updateDay(d.dow, { endHour: v })}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
