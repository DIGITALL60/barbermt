import { Router } from "express";
import { db, appointmentsTable, servicesTable, scheduleTable } from "@workspace/db";
import { and, eq, sql } from "drizzle-orm";
import { GetAvailabilityQueryParams } from "@workspace/api-zod";

const router = Router();

const DEFAULT_INTERVAL = 30;

function generateSlots(startHour: number, endHour: number, durationMinutes: number): string[] {
  const slots: string[] = [];
  let currentMinute = startHour * 60;
  const endMinute = endHour * 60;

  while (currentMinute + durationMinutes <= endMinute) {
    const h = String(Math.floor(currentMinute / 60)).padStart(2, "0");
    const m = String(currentMinute % 60).padStart(2, "0");
    slots.push(`${h}:${m}`);
    currentMinute += durationMinutes;
  }
  return slots;
}

function isSlotConflict(
  slotTime: string,
  slotDuration: number,
  bookedSlot: string,
  bookedDuration: number
): boolean {
  const toMinutes = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };
  const slotStart = toMinutes(slotTime);
  const slotEnd = slotStart + slotDuration;
  const bookedStart = toMinutes(bookedSlot);
  const bookedEnd = bookedStart + bookedDuration;
  return slotStart < bookedEnd && slotEnd > bookedStart;
}

router.get("/", async (req, res) => {
  const query = GetAvailabilityQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: "Parámetros inválidos", details: query.error.issues });
    return;
  }

  const { barberId, date, serviceId } = query.data;

  // Verificar si el día de la semana está habilitado en el horario
  const dateObj = new Date(date + "T12:00:00");
  const dayOfWeek = dateObj.getDay(); // 0=Dom...6=Sáb

  const scheduleRows = await db
    .select()
    .from(scheduleTable)
    .where(eq(scheduleTable.dayOfWeek, dayOfWeek))
    .limit(1);

  // Si hay configuración de horario y está deshabilitado, retornar sin slots
  if (scheduleRows.length > 0 && !scheduleRows[0].enabled) {
    res.json({ date, barberId, slots: [], dayDisabled: true });
    return;
  }

  const startHour = scheduleRows[0]?.startHour ?? 9;
  const endHour = scheduleRows[0]?.endHour ?? 20;

  let durationMinutes = DEFAULT_INTERVAL;
  if (serviceId) {
    const service = await db
      .select({ durationMinutes: servicesTable.durationMinutes })
      .from(servicesTable)
      .where(eq(servicesTable.id, serviceId))
      .limit(1);
    if (service[0]) {
      durationMinutes = service[0].durationMinutes;
    }
  }

  const booked = await db
    .select({
      timeSlot: appointmentsTable.timeSlot,
      durationMinutes: servicesTable.durationMinutes,
    })
    .from(appointmentsTable)
    .leftJoin(servicesTable, eq(appointmentsTable.serviceId, servicesTable.id))
    .where(
      and(
        eq(appointmentsTable.barberId, barberId),
        eq(appointmentsTable.date, date),
        sql`${appointmentsTable.status} != 'cancelled'`
      )
    );

  const allSlots = generateSlots(startHour, endHour, durationMinutes);

  const slots = allSlots.map((time) => {
    const hasConflict = booked.some((b) =>
      isSlotConflict(time, durationMinutes, b.timeSlot, b.durationMinutes ?? DEFAULT_INTERVAL)
    );
    return { time, available: !hasConflict };
  });

  res.json({ date, barberId, slots });
});

export default router;
