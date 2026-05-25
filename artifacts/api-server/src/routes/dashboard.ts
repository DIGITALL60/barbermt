import { Router } from "express";
import { db, appointmentsTable, barbersTable, servicesTable } from "@workspace/db";
import { eq, and, gte, lte, sql } from "drizzle-orm";

const router = Router();

router.get("/summary", async (_req, res) => {
  const today = new Date().toISOString().split("T")[0];
  const startOfWeek = new Date();
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  const weekStart = startOfWeek.toISOString().split("T")[0];

  const [todayResult, weekResult, statusResult, revenueResult, topServiceResult, topBarberResult] =
    await Promise.all([
      db
        .select({ count: sql<number>`count(*)` })
        .from(appointmentsTable)
        .where(and(eq(appointmentsTable.date, today), sql`${appointmentsTable.status} != 'cancelled'`)),

      db
        .select({ count: sql<number>`count(*)` })
        .from(appointmentsTable)
        .where(and(gte(appointmentsTable.date, weekStart), sql`${appointmentsTable.status} != 'cancelled'`)),

      db
        .select({
          status: appointmentsTable.status,
          count: sql<number>`count(*)`,
        })
        .from(appointmentsTable)
        .groupBy(appointmentsTable.status),

      db
        .select({ total: sql<number>`coalesce(sum(${servicesTable.price}), 0)` })
        .from(appointmentsTable)
        .leftJoin(servicesTable, eq(appointmentsTable.serviceId, servicesTable.id))
        .where(eq(appointmentsTable.status, "completed")),

      db
        .select({
          name: servicesTable.name,
          count: sql<number>`count(*)`,
        })
        .from(appointmentsTable)
        .leftJoin(servicesTable, eq(appointmentsTable.serviceId, servicesTable.id))
        .where(sql`${appointmentsTable.status} != 'cancelled'`)
        .groupBy(servicesTable.name)
        .orderBy(sql`count(*) desc`)
        .limit(1),

      db
        .select({
          name: barbersTable.name,
          count: sql<number>`count(*)`,
        })
        .from(appointmentsTable)
        .leftJoin(barbersTable, eq(appointmentsTable.barberId, barbersTable.id))
        .where(sql`${appointmentsTable.status} != 'cancelled'`)
        .groupBy(barbersTable.name)
        .orderBy(sql`count(*) desc`)
        .limit(1),
    ]);

  const statusMap = new Map(statusResult.map((s) => [s.status, s.count]));

  res.json({
    todayCount: todayResult[0]?.count ?? 0,
    weekCount: weekResult[0]?.count ?? 0,
    pendingCount: statusMap.get("pending") ?? 0,
    confirmedCount: statusMap.get("confirmed") ?? 0,
    totalRevenue: revenueResult[0]?.total ?? 0,
    topService: topServiceResult[0]?.name ?? null,
    topBarber: topBarberResult[0]?.name ?? null,
  });
});

export default router;
