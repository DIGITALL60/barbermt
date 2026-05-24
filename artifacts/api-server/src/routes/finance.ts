import { Router } from "express";
import { db, appointmentsTable, barbersTable, servicesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

const MONTH_NAMES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

/**
 * GET /api/finance/summary?year=2025&month=5
 * Returns comprehensive financial data for the admin panel.
 * Uses JavaScript-side aggregation for maximum SQLite compatibility.
 */
router.get("/summary", async (req, res) => {
  try {
    const now = new Date();
    const year = req.query.year ? parseInt(String(req.query.year)) : now.getFullYear();
    const month = req.query.month ? parseInt(String(req.query.month)) : now.getMonth() + 1; // 1-12

    // Validate
    if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
      res.status(400).json({ error: "Parámetros de año/mes inválidos" });
      return;
    }

    // Fetch ALL completed appointments with service and barber info
    // We do JS-side filtering — simplest and most SQLite-compatible approach
    const allCompleted = await db
      .select({
        id: appointmentsTable.id,
        date: appointmentsTable.date,
        status: appointmentsTable.status,
        servicePrice: servicesTable.price,
        serviceName: servicesTable.name,
        barberName: barbersTable.name,
      })
      .from(appointmentsTable)
      .leftJoin(servicesTable, eq(appointmentsTable.serviceId, servicesTable.id))
      .leftJoin(barbersTable, eq(appointmentsTable.barberId, barbersTable.id))
      .where(eq(appointmentsTable.status, "completed"));

    // Fetch ALL appointments for the selected month (any status) for counts
    const allInMonth = await db
      .select({
        id: appointmentsTable.id,
        date: appointmentsTable.date,
        status: appointmentsTable.status,
      })
      .from(appointmentsTable);

    // ── Helper: parse "YYYY-MM-DD" safely ─────────────────────────────────
    function parseDate(dateStr: string): { year: number; month: number } | null {
      const parts = dateStr.split("-");
      if (parts.length < 2) return null;
      const y = parseInt(parts[0]);
      const m = parseInt(parts[1]);
      if (isNaN(y) || isNaN(m)) return null;
      return { year: y, month: m };
    }

    // ── All-time stats ─────────────────────────────────────────────────────
    const allTimeRevenue = allCompleted.reduce((sum, r) => sum + (Number(r.servicePrice) || 0), 0);
    const allTimeCompleted = allCompleted.length;

    // ── Selected month stats (completed) ──────────────────────────────────
    const monthCompleted = allCompleted.filter((r) => {
      const d = parseDate(r.date);
      return d && d.year === year && d.month === month;
    });

    const monthlyRevenue = monthCompleted.reduce((sum, r) => sum + (Number(r.servicePrice) || 0), 0);

    // ── Selected month counts (all statuses) ──────────────────────────────
    const monthAll = allInMonth.filter((r) => {
      const d = parseDate(r.date);
      return d && d.year === year && d.month === month;
    });
    const monthlyCompleted = monthAll.filter((r) => r.status === "completed").length;
    const monthlyPending = monthAll.filter((r) => r.status === "pending").length;
    const monthlyCancelled = monthAll.filter((r) => r.status === "cancelled").length;

    // ── Revenue by barber (selected month) ────────────────────────────────
    const barberMap = new Map<string, { total: number; count: number }>();
    for (const r of monthCompleted) {
      const name = r.barberName ?? "Sin nombre";
      const prev = barberMap.get(name) ?? { total: 0, count: 0 };
      barberMap.set(name, { total: prev.total + (Number(r.servicePrice) || 0), count: prev.count + 1 });
    }
    const revenueByBarber = Array.from(barberMap.entries())
      .map(([name, v]) => ({ name, total: v.total, count: v.count }))
      .sort((a, b) => b.total - a.total);

    // ── Revenue by service (selected month) ───────────────────────────────
    const serviceMap = new Map<string, { total: number; count: number }>();
    for (const r of monthCompleted) {
      const name = r.serviceName ?? "Sin nombre";
      const prev = serviceMap.get(name) ?? { total: 0, count: 0 };
      serviceMap.set(name, { total: prev.total + (Number(r.servicePrice) || 0), count: prev.count + 1 });
    }
    const revenueByService = Array.from(serviceMap.entries())
      .map(([name, v]) => ({ name, total: v.total, count: v.count }))
      .sort((a, b) => b.total - a.total);

    // ── Yearly chart (all 12 months of the selected year) ─────────────────
    const yearCompleted = allCompleted.filter((r) => {
      const d = parseDate(r.date);
      return d && d.year === year;
    });

    const yearlyChart = MONTH_NAMES.map((monthName, i) => {
      const m = i + 1;
      const rows = yearCompleted.filter((r) => {
        const d = parseDate(r.date);
        return d && d.month === m;
      });
      return {
        month: monthName,
        revenue: rows.reduce((sum, r) => sum + (Number(r.servicePrice) || 0), 0),
        appointments: rows.length,
      };
    });

    res.json({
      selectedMonth: { year, month },
      monthlyRevenue,
      monthlyCompleted,
      monthlyPending,
      monthlyCancelled,
      allTimeRevenue,
      allTimeCompleted,
      revenueByBarber,
      revenueByService,
      yearlyChart,
    });
  } catch (err) {
    console.error("[Finance] Error al obtener resumen financiero:", err);
    res.status(500).json({ error: "Error interno al calcular las finanzas" });
  }
});

export default router;
