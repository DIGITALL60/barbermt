import { Router } from "express";
import { db, appointmentsTable, servicesTable } from "@workspace/db";
import { and, eq, sql } from "drizzle-orm";
import { GetAvailabilityQueryParams } from "@workspace/api-zod";

const router = Router();

const BUSINESS_HOURS = {
  start: 9,
  end: 20,
  intervalMinutes: 30,
};

function generateSlots(durationMinutes: number): string[] {
  const slots: string[] = [];
  const { start, end, intervalMinutes } = BUSINESS_HOURS;
  for (let hour = start; hour < end; hour++) {
    for (let minute = 0; minute < 60; minute += intervalMinutes) {
      const slotStart = hour * 60 + minute;
      const slotEnd = slotStart + durationMinutes;
      if (slotEnd <= end * 60) {
        const h = String(hour).padStart(2, "0");
        const m = String(minute).padStart(2, "0");
        slots.push(`${h}:${m}`);
      }
    }
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

  let durationMinutes = BUSINESS_HOURS.intervalMinutes;
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

  const allSlots = generateSlots(durationMinutes);

  const slots = allSlots.map((time) => {
    const hasConflict = booked.some((b) =>
      isSlotConflict(time, durationMinutes, b.timeSlot, b.durationMinutes ?? BUSINESS_HOURS.intervalMinutes)
    );
    return { time, available: !hasConflict };
  });

  res.json({ date, barberId, slots });
});

export default router;
