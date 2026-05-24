import { useState } from "react";
import { AdminLayout } from "@/components/layout/admin-layout";
import {
  useGetFinanceSummary,
  type FinanceRevenueByEntity,
  type FinanceChartMonth,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DollarSign,
  TrendingUp,
  CheckCircle,
  Clock,
  XCircle,
  ChevronLeft,
  ChevronRight,
  BarChart2,
  Scissors,
  Users,
} from "lucide-react";

// ── Helpers ────────────────────────────────────────────────────────────────
function formatPrice(n: number) {
  return `$${Math.round(n).toLocaleString("es-AR")}`;
}

const MONTH_NAMES_FULL = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

// ── Bar chart (SVG) ──────────────────────────────────────────────────────
function BarChart({ data }: { data: FinanceChartMonth[] }) {
  const maxRev = Math.max(...data.map((d) => d.revenue), 1);

  return (
    <div className="w-full overflow-x-auto">
      <div style={{ minWidth: "560px" }}>
        <svg viewBox="0 0 560 180" className="w-full" aria-label="Ingresos por mes">
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
            const y = 10 + (1 - frac) * 140;
            return (
              <g key={frac}>
                <line x1="40" y1={y} x2="552" y2={y} stroke="currentColor" strokeOpacity={0.08} strokeWidth="1" />
                <text x="36" y={y + 4} textAnchor="end" fontSize="9" fill="currentColor" fillOpacity={0.4}>
                  {frac > 0 ? formatPrice(maxRev * frac) : ""}
                </text>
              </g>
            );
          })}

          {/* Bars */}
          {data.map((d, i) => {
            const barW = 28;
            const gap = (560 - 40 - 12) / 12;
            const x = 40 + i * gap + (gap - barW) / 2;
            const barH = Math.max((d.revenue / maxRev) * 140, 2);
            const y = 150 - barH;
            const isCurrentMonth = i === new Date().getMonth();

            return (
              <g key={d.month}>
                <rect
                  x={x}
                  y={y}
                  width={barW}
                  height={barH}
                  rx="4"
                  fill={isCurrentMonth ? "hsl(var(--primary))" : "hsl(var(--primary) / 0.45)"}
                  className="transition-all duration-300"
                />
                <text
                  x={x + barW / 2}
                  y="168"
                  textAnchor="middle"
                  fontSize="9"
                  fill="currentColor"
                  fillOpacity={0.5}
                >
                  {d.month}
                </text>
                {d.revenue > 0 && (
                  <text
                    x={x + barW / 2}
                    y={y - 4}
                    textAnchor="middle"
                    fontSize="8"
                    fill="currentColor"
                    fillOpacity={0.7}
                  >
                    {formatPrice(d.revenue)}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

// ── Horizontal bar ───────────────────────────────────────────────────────
function HorizontalBars({
  items,
  colorClass,
}: {
  items: FinanceRevenueByEntity[];
  colorClass: string;
}) {
  const max = Math.max(...items.map((i) => i.total), 1);

  if (!items.length) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        Sin datos para este período
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.name}>
          <div className="flex justify-between text-sm mb-1">
            <span className="font-medium truncate max-w-[60%]">{item.name}</span>
            <span className="text-muted-foreground text-xs">
              {formatPrice(item.total)} · {item.count} turno{item.count !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${colorClass}`}
              style={{ width: `${(item.total / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Stat card ────────────────────────────────────────────────────────────
function StatCard({
  label,
  value,
  icon: Icon,
  colorClass,
  sub,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  colorClass: string;
  sub?: string;
}) {
  return (
    <Card className="relative overflow-hidden">
      <div className={`absolute inset-0 opacity-5 ${colorClass}`} />
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <div className={`p-2 rounded-lg ${colorClass} bg-opacity-10`}>
          <Icon className="w-4 h-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

// ── Main page ────────────────────────────────────────────────────────────
export default function FinancesPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const { data, isLoading } = useGetFinanceSummary({ year, month });

  function prevMonth() {
    if (month === 1) { setYear((y) => y - 1); setMonth(12); }
    else setMonth((m) => m - 1);
  }
  function nextMonth() {
    const next = month === 12 ? { y: year + 1, m: 1 } : { y: year, m: month + 1 };
    // Don't go into the future
    if (next.y > now.getFullYear() || (next.y === now.getFullYear() && next.m > now.getMonth() + 1)) return;
    setYear(next.y);
    setMonth(next.m);
  }

  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Finanzas</h1>
            <p className="text-muted-foreground mt-1">Resumen de ingresos y estadísticas</p>
          </div>

          {/* Month navigator */}
          <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-2 self-start">
            <button
              id="finance-prev-month"
              onClick={prevMonth}
              className="p-1 rounded hover:bg-secondary transition-colors"
              aria-label="Mes anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-semibold min-w-[140px] text-center">
              {MONTH_NAMES_FULL[month - 1]} {year}
            </span>
            <button
              id="finance-next-month"
              onClick={nextMonth}
              disabled={isCurrentMonth}
              className="p-1 rounded hover:bg-secondary transition-colors disabled:opacity-30"
              aria-label="Mes siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader className="h-24 bg-muted/50 rounded-t-lg" />
              </Card>
            ))}
          </div>
        ) : data ? (
          <>
            {/* ── KPI cards ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                label="Ingresos del mes"
                value={formatPrice(data.monthlyRevenue)}
                icon={DollarSign}
                colorClass="bg-primary text-primary"
                sub={`${data.monthlyCompleted} turno${data.monthlyCompleted !== 1 ? "s" : ""} completado${data.monthlyCompleted !== 1 ? "s" : ""}`}
              />
              <StatCard
                label="Ingresos totales"
                value={formatPrice(data.allTimeRevenue)}
                icon={TrendingUp}
                colorClass="bg-violet-500 text-violet-400"
                sub={`${data.allTimeCompleted} turnos completados (histórico)`}
              />
              <StatCard
                label="Completados"
                value={data.monthlyCompleted}
                icon={CheckCircle}
                colorClass="bg-green-500 text-green-500"
                sub="Turnos completados este mes"
              />
              <StatCard
                label="Pendientes / Cancelados"
                value={`${data.monthlyPending} / ${data.monthlyCancelled}`}
                icon={Clock}
                colorClass="bg-yellow-500 text-yellow-500"
                sub="Pendientes · Cancelados este mes"
              />
            </div>

            {/* ── Yearly chart ── */}
            <Card>
              <CardHeader className="flex flex-row items-center gap-2 pb-2">
                <BarChart2 className="w-5 h-5 text-primary" />
                <CardTitle className="text-base">Ingresos por mes — {year}</CardTitle>
              </CardHeader>
              <CardContent>
                <BarChart data={data.yearlyChart} />
              </CardContent>
            </Card>

            {/* ── Revenue by barber & service ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center gap-2 pb-2">
                  <Users className="w-5 h-5 text-primary" />
                  <CardTitle className="text-base">Ingresos por barbero</CardTitle>
                </CardHeader>
                <CardContent>
                  <HorizontalBars
                    items={data.revenueByBarber}
                    colorClass="bg-primary"
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center gap-2 pb-2">
                  <Scissors className="w-5 h-5 text-primary" />
                  <CardTitle className="text-base">Ingresos por servicio</CardTitle>
                </CardHeader>
                <CardContent>
                  <HorizontalBars
                    items={data.revenueByService}
                    colorClass="bg-violet-500"
                  />
                </CardContent>
              </Card>
            </div>

            {/* ── Month summary table ── */}
            {(data.revenueByBarber.length > 0 || data.revenueByService.length > 0) && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">
                    Detalle — {MONTH_NAMES_FULL[month - 1]} {year}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border text-muted-foreground text-xs uppercase tracking-wider">
                          <th className="py-2 text-left">Barbero</th>
                          <th className="py-2 text-right">Turnos</th>
                          <th className="py-2 text-right">Ingresos</th>
                          <th className="py-2 text-right">Prom./turno</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.revenueByBarber.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="py-6 text-center text-muted-foreground">
                              Sin datos para este período
                            </td>
                          </tr>
                        ) : (
                          data.revenueByBarber.map((b) => (
                            <tr key={b.name} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                              <td className="py-3 font-medium">{b.name}</td>
                              <td className="py-3 text-right text-muted-foreground">{b.count}</td>
                              <td className="py-3 text-right font-semibold text-primary">
                                {formatPrice(b.total)}
                              </td>
                              <td className="py-3 text-right text-muted-foreground">
                                {b.count > 0 ? formatPrice(b.total / b.count) : "-"}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                      {data.revenueByBarber.length > 0 && (
                        <tfoot>
                          <tr className="font-bold text-sm">
                            <td className="pt-3">Total</td>
                            <td className="pt-3 text-right">{data.monthlyCompleted}</td>
                            <td className="pt-3 text-right text-primary">
                              {formatPrice(data.monthlyRevenue)}
                            </td>
                            <td className="pt-3 text-right text-muted-foreground">
                              {data.monthlyCompleted > 0
                                ? formatPrice(data.monthlyRevenue / data.monthlyCompleted)
                                : "-"}
                            </td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Empty state */}
            {data.monthlyRevenue === 0 && data.monthlyCompleted === 0 && (
              <Card>
                <CardContent className="p-10 text-center">
                  <XCircle className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
                  <p className="text-muted-foreground">
                    No hay turnos completados en {MONTH_NAMES_FULL[month - 1]} {year}.
                  </p>
                </CardContent>
              </Card>
            )}
          </>
        ) : null}
      </div>
    </AdminLayout>
  );
}
