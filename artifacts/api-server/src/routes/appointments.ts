import { Router } from "express";
import { db, appointmentsTable, barbersTable, servicesTable } from "@workspace/db";
import { eq, and, sql, desc } from "drizzle-orm";
import {
  ListAppointmentsQueryParams,
  CreateAppointmentBody,
  UpdateAppointmentBody,
  GetAppointmentParams,
  UpdateAppointmentParams,
  DeleteAppointmentParams,
} from "@workspace/api-zod";

const router = Router();

const BOT_URL = (process.env.BOT_URL || "http://127.0.0.1:3000").replace(/\/+$/, "");

function notifyWhatsApp(telefono: string, mensaje: string, label: string) {
  fetch(`${BOT_URL}/api/notify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ telefono, mensaje }),
  }).then(async (response) => {
    const result = await response.json();
    console.log(`[WhatsApp] ${label}:`, result);
  }).catch((err) => {
    console.warn(`[WhatsApp] No se pudo notificar (${label}):`, err.message);
  });
}

function formatAppointment(
  a: typeof appointmentsTable.$inferSelect,
  barberName?: string | null,
  serviceName?: string | null,
  servicePrice?: number | null
) {
  return {
    id: a.id,
    barberId: a.barberId,
    barberName: barberName ?? null,
    serviceId: a.serviceId,
    serviceName: serviceName ?? null,
    servicePrice: servicePrice ?? null,
    clientName: a.clientName,
    clientPhone: a.clientPhone,
    date: a.date,
    timeSlot: a.timeSlot,
    status: a.status,
    notes: a.notes,
    createdAt: a.createdAt.toISOString(),
  };
}

router.get("/today", async (_req, res) => {
  const today = new Date().toISOString().split("T")[0];
  const rows = await db
    .select({
      appointment: appointmentsTable,
      barberName: barbersTable.name,
      serviceName: servicesTable.name,
      servicePrice: servicesTable.price,
    })
    .from(appointmentsTable)
    .leftJoin(barbersTable, eq(appointmentsTable.barberId, barbersTable.id))
    .leftJoin(servicesTable, eq(appointmentsTable.serviceId, servicesTable.id))
    .where(eq(appointmentsTable.date, today))
    .orderBy(appointmentsTable.timeSlot);

  res.json(rows.map((r) => formatAppointment(r.appointment, r.barberName, r.serviceName, r.servicePrice ?? null)));
});

router.get("/", async (req, res) => {
  const query = ListAppointmentsQueryParams.safeParse(req.query);

  const rows = await db
    .select({
      appointment: appointmentsTable,
      barberName: barbersTable.name,
      serviceName: servicesTable.name,
      servicePrice: servicesTable.price,
    })
    .from(appointmentsTable)
    .leftJoin(barbersTable, eq(appointmentsTable.barberId, barbersTable.id))
    .leftJoin(servicesTable, eq(appointmentsTable.serviceId, servicesTable.id))
    .orderBy(appointmentsTable.date, appointmentsTable.timeSlot);

  let results = rows;

  if (query.success) {
    if (query.data.date) results = results.filter((r) => r.appointment.date === query.data.date);
    if (query.data.barberId) results = results.filter((r) => r.appointment.barberId === query.data.barberId);
    if (query.data.status) results = results.filter((r) => r.appointment.status === query.data.status);
  }

  res.json(results.map((r) => formatAppointment(r.appointment, r.barberName, r.serviceName, r.servicePrice ?? null)));
});

router.post("/", async (req, res) => {
  const parsed = CreateAppointmentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Datos inválidos", details: parsed.error.issues });
    return;
  }
  const { barberId, serviceId, clientName, clientPhone, date, timeSlot, notes } = parsed.data;

  const existing = await db
    .select()
    .from(appointmentsTable)
    .where(
      and(
        eq(appointmentsTable.barberId, barberId),
        eq(appointmentsTable.date, date),
        eq(appointmentsTable.timeSlot, timeSlot),
        sql`${appointmentsTable.status} != 'cancelled'`
      )
    );

  if (existing.length > 0) {
    res.status(409).json({ error: "Ese horario ya está ocupado" });
    return;
  }

  const [appointment] = await db
    .insert(appointmentsTable)
    .values({ barberId, serviceId, clientName, clientPhone, date, timeSlot, notes })
    .returning();

  const barber = await db.select().from(barbersTable).where(eq(barbersTable.id, barberId)).limit(1);
  const service = await db.select().from(servicesTable).where(eq(servicesTable.id, serviceId)).limit(1);

  if (clientPhone) {
    const barberName = barber[0]?.name ?? "Tu barbero";
    const serviceName = service[0]?.name ?? "Servicio";
    const servicePrice = service[0]?.price ?? 0;

    // Notificar al cliente
    notifyWhatsApp(clientPhone,
`✅ *TURNO CONFIRMADO - BARBER M.T*

👤 Cliente: ${clientName}
📅 Fecha: ${date}
⏰ Hora: ${timeSlot}
💈 Servicio: ${serviceName}
👨‍💼 Barbero: ${barberName}
💵 Precio: $${servicePrice.toLocaleString("es-AR")}

Te esperamos. ¡Gracias por elegirnos! 💈`,
      "Cliente"
    );

    // Notificar al barbero
    notifyWhatsApp(
      "5493534810359",
      `💈 NUEVO TURNO - BARBER M.T\n\n👤 Cliente: ${clientName} (${clientPhone})\n📅 Fecha: ${date}\n⏰ Hora: ${timeSlot}\n💈 Servicio: ${serviceName}`,
      "Barbero"
    );
  }

  res.status(201).json(formatAppointment(appointment, barber[0]?.name, service[0]?.name, service[0]?.price ?? null));
});

router.get("/:id", async (req, res) => {
  const params = GetAppointmentParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "ID inválido" }); return; }

  const rows = await db
    .select({
      appointment: appointmentsTable,
      barberName: barbersTable.name,
      serviceName: servicesTable.name,
      servicePrice: servicesTable.price,
    })
    .from(appointmentsTable)
    .leftJoin(barbersTable, eq(appointmentsTable.barberId, barbersTable.id))
    .leftJoin(servicesTable, eq(appointmentsTable.serviceId, servicesTable.id))
    .where(eq(appointmentsTable.id, params.data.id))
    .limit(1);

  if (!rows[0]) { res.status(404).json({ error: "Turno no encontrado" }); return; }
  res.json(formatAppointment(rows[0].appointment, rows[0].barberName, rows[0].serviceName, rows[0].servicePrice ?? null));
});

router.patch("/:id", async (req, res) => {
  const params = UpdateAppointmentParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "ID inválido" }); return; }

  const parsed = UpdateAppointmentBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Datos inválidos", details: parsed.error.issues }); return; }

  const updates: Record<string, unknown> = {};
  if (parsed.data.status !== undefined) updates.status = parsed.data.status;
  if (parsed.data.notes !== undefined) updates.notes = parsed.data.notes;
  if (parsed.data.timeSlot !== undefined) updates.timeSlot = parsed.data.timeSlot;
  if (parsed.data.date !== undefined) updates.date = parsed.data.date;

  const [appointment] = await db
    .update(appointmentsTable)
    .set(updates)
    .where(eq(appointmentsTable.id, params.data.id))
    .returning();

  if (!appointment) { res.status(404).json({ error: "Turno no encontrado" }); return; }

  const rows = await db
    .select({
      appointment: appointmentsTable,
      barberName: barbersTable.name,
      serviceName: servicesTable.name,
      servicePrice: servicesTable.price,
    })
    .from(appointmentsTable)
    .leftJoin(barbersTable, eq(appointmentsTable.barberId, barbersTable.id))
    .leftJoin(servicesTable, eq(appointmentsTable.serviceId, servicesTable.id))
    .where(eq(appointmentsTable.id, params.data.id))
    .limit(1);

  const r = rows[0];

  // Notificar al cliente si el estado cambió a confirmado o cancelado
  if (parsed.data.status && r.appointment.clientPhone) {
    const statusMsg: Record<string, string> = {
      confirmed: `✅ *Tu turno fue CONFIRMADO - BARBER M.T*\n\n📅 Fecha: ${r.appointment.date}\n⏰ Hora: ${r.appointment.timeSlot}\n💈 Servicio: ${r.serviceName ?? ""}\n\n¡Te esperamos! 💈`,
      cancelled: `❌ *Tu turno fue CANCELADO - BARBER M.T*\n\n📅 Fecha: ${r.appointment.date}\n⏰ Hora: ${r.appointment.timeSlot}\n\nEscribinos por WhatsApp para reagendar.`,
      completed: `🏁 *¡Gracias por visitarnos! - BARBER M.T*\n\nFue un placer atenderte. ¡Te esperamos pronto! 💈`,
    };
    if (statusMsg[parsed.data.status]) {
      notifyWhatsApp(r.appointment.clientPhone, statusMsg[parsed.data.status], `Estado → ${parsed.data.status}`);
    }
  }

  res.json(formatAppointment(r.appointment, r.barberName, r.serviceName, r.servicePrice ?? null));
});

router.delete("/:id", async (req, res) => {
  const params = DeleteAppointmentParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "ID inválido" }); return; }
  await db.delete(appointmentsTable).where(eq(appointmentsTable.id, params.data.id));
  res.status(204).send();
});

router.get("/export", async (_req, res) => {
  const rows = await db
    .select({
      appointment: appointmentsTable,
      barberName: barbersTable.name,
      serviceName: servicesTable.name,
      servicePrice: servicesTable.price,
    })
    .from(appointmentsTable)
    .leftJoin(barbersTable, eq(appointmentsTable.barberId, barbersTable.id))
    .leftJoin(servicesTable, eq(appointmentsTable.serviceId, servicesTable.id))
    .orderBy(desc(appointmentsTable.date), appointmentsTable.timeSlot);

  const escape = (v: unknown) => {
    const s = String(v ?? "");
    return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const STATUS_LABELS: Record<string, string> = {
    pending: "Pendiente", confirmed: "Confirmado", completed: "Completado", cancelled: "Cancelado",
  };

  const lines = [
    "ID,Cliente,Teléfono,Fecha,Hora,Servicio,Precio,Barbero,Estado,Creado",
    ...rows.map((r) => {
      const a = r.appointment;
      const precio = r.servicePrice != null ? `$${r.servicePrice.toLocaleString("es-AR")}` : "";
      return [a.id, escape(a.clientName), escape(a.clientPhone), a.date, a.timeSlot, escape(r.serviceName), precio, escape(r.barberName), STATUS_LABELS[a.status] ?? a.status, a.createdAt.toISOString()].join(",");
    }),
  ].join("\n");

  const date = new Date().toISOString().split("T")[0];
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="turnos-${date}.csv"`);
  res.send("\uFEFF" + lines);
});

export default router;
