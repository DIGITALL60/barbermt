import { Router } from "express";
import { db, scheduleTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

// GET /api/schedule — devuelve los 7 días
router.get("/", async (_req, res) => {
  const rows = await db.select().from(scheduleTable).orderBy(scheduleTable.dayOfWeek);
  res.json(rows);
});

// PUT /api/schedule/:dayOfWeek — actualiza un día
router.put("/:dayOfWeek", async (req, res) => {
  const dayOfWeek = parseInt(req.params.dayOfWeek, 10);
  if (isNaN(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
    res.status(400).json({ error: "Día inválido (0-6)" });
    return;
  }

  const { enabled, startHour, endHour } = req.body as {
    enabled?: boolean;
    startHour?: number;
    endHour?: number;
  };

  if (
    (enabled !== undefined && typeof enabled !== "boolean") ||
    (startHour !== undefined && (typeof startHour !== "number" || startHour < 0 || startHour > 23)) ||
    (endHour !== undefined && (typeof endHour !== "number" || endHour < 1 || endHour > 24))
  ) {
    res.status(400).json({ error: "Datos inválidos" });
    return;
  }

  const existing = await db.select().from(scheduleTable).where(eq(scheduleTable.dayOfWeek, dayOfWeek)).limit(1);

  if (existing.length === 0) {
    const [row] = await db.insert(scheduleTable).values({
      dayOfWeek,
      enabled: enabled ?? true,
      startHour: startHour ?? 9,
      endHour: endHour ?? 20,
    }).returning();
    res.json(row);
  } else {
    const updates: Record<string, unknown> = {};
    if (enabled !== undefined) updates.enabled = enabled;
    if (startHour !== undefined) updates.startHour = startHour;
    if (endHour !== undefined) updates.endHour = endHour;

    const [row] = await db.update(scheduleTable).set(updates).where(eq(scheduleTable.dayOfWeek, dayOfWeek)).returning();
    res.json(row);
  }
});

export default router;
