import { Router } from "express";
import { db, appointmentsTable, barbersTable, servicesTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { logger } from "../lib/logger";

const router = Router();

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN ?? "newkingbarber_verify_token";

interface ConversationState {
  step: string;
  serviceId?: number;
  barberId?: number;
  date?: string;
  timeSlot?: string;
  clientName?: string;
}

const conversations = new Map<string, ConversationState>();

async function sendWhatsAppMessage(to: string, message: string) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID;
  if (!token || !phoneId) {
    logger.warn("WhatsApp credentials not configured");
    return;
  }
  try {
    await fetch(`https://graph.facebook.com/v18.0/${phoneId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body: message },
      }),
    });
  } catch (err) {
    logger.error({ err }, "Error sending WhatsApp message");
  }
}

async function handleMessage(phone: string, text: string): Promise<string> {
  const msg = text.trim().toLowerCase();
  let state = conversations.get(phone) ?? { step: "start" };

  if (msg === "hola" || msg === "turno" || msg === "quiero un turno" || msg === "sacar turno" || state.step === "start") {
    const services = await db
      .select()
      .from(servicesTable)
      .where(eq(servicesTable.active, true))
      .orderBy(servicesTable.name);

    if (services.length === 0) {
      return "Lo sentimos, no hay servicios disponibles en este momento. Intentá más tarde.";
    }

    const list = services
      .map((s, i) => `${i + 1}. ${s.name} - $${s.price.toLocaleString("es-AR")} (${s.durationMinutes} min)`)
      .join("\n");

    conversations.set(phone, { step: "select_service" });
    return `Hola! Bienvenido a *Barber M.T* ✂️\n\nElegí el servicio:\n${list}\n\nRespondé con el número del servicio.`;
  }

  if (state.step === "select_service") {
    const services = await db.select().from(servicesTable).where(eq(servicesTable.active, true));
    const index = parseInt(msg) - 1;
    if (isNaN(index) || index < 0 || index >= services.length) {
      return "Por favor, ingresá el número del servicio que querés.";
    }
    state.serviceId = services[index].id;
    state.step = "select_barber";

    const barbers = await db.select().from(barbersTable).where(eq(barbersTable.active, true));
    const list = barbers.map((b, i) => `${i + 1}. ${b.name}`).join("\n");
    conversations.set(phone, state);
    return `Elegí el barbero:\n${list}\n\nRespondé con el número.`;
  }

  if (state.step === "select_barber") {
    const barbers = await db.select().from(barbersTable).where(eq(barbersTable.active, true));
    const index = parseInt(msg) - 1;
    if (isNaN(index) || index < 0 || index >= barbers.length) {
      return "Por favor, ingresá el número del barbero.";
    }
    state.barberId = barbers[index].id;
    state.step = "select_date";
    conversations.set(phone, state);

    const today = new Date();
    const dates = [];
    for (let i = 1; i <= 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      if (d.getDay() !== 0) {
        dates.push(d.toISOString().split("T")[0]);
      }
    }
    const list = dates.map((d, i) => `${i + 1}. ${d}`).join("\n");
    return `Elegí la fecha:\n${list}\n\nRespondé con el número.`;
  }

  if (state.step === "select_date") {
    const today = new Date();
    const dates: string[] = [];
    for (let i = 1; i <= 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      if (d.getDay() !== 0) dates.push(d.toISOString().split("T")[0]);
    }
    const index = parseInt(msg) - 1;
    if (isNaN(index) || index < 0 || index >= dates.length) {
      return "Por favor, ingresá el número de la fecha.";
    }
    state.date = dates[index];
    state.step = "select_time";
    conversations.set(phone, state);

    const booked = await db
      .select({ timeSlot: appointmentsTable.timeSlot })
      .from(appointmentsTable)
      .where(
        and(
          eq(appointmentsTable.barberId, state.barberId!),
          eq(appointmentsTable.date, state.date),
          sql`${appointmentsTable.status} != 'cancelled'`
        )
      );
    const bookedTimes = new Set(booked.map((b) => b.timeSlot));
    const allSlots = [];
    for (let h = 9; h < 20; h++) {
      for (const m of [0, 30]) {
        const time = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
        if (!bookedTimes.has(time)) allSlots.push(time);
      }
    }
    if (allSlots.length === 0) {
      state.step = "select_date";
      return "No hay horarios disponibles para esa fecha. Elegí otra.";
    }
    const list = allSlots.map((t, i) => `${i + 1}. ${t}`).join("\n");
    return `Horarios disponibles el ${state.date}:\n${list}\n\nRespondé con el número del horario.`;
  }

  if (state.step === "select_time") {
    const booked = await db
      .select({ timeSlot: appointmentsTable.timeSlot })
      .from(appointmentsTable)
      .where(
        and(
          eq(appointmentsTable.barberId, state.barberId!),
          eq(appointmentsTable.date, state.date!),
          sql`${appointmentsTable.status} != 'cancelled'`
        )
      );
    const bookedTimes = new Set(booked.map((b) => b.timeSlot));
    const allSlots = [];
    for (let h = 9; h < 20; h++) {
      for (const m of [0, 30]) {
        const time = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
        if (!bookedTimes.has(time)) allSlots.push(time);
      }
    }
    const index = parseInt(msg) - 1;
    if (isNaN(index) || index < 0 || index >= allSlots.length) {
      return "Por favor, ingresá el número del horario.";
    }
    state.timeSlot = allSlots[index];
    state.step = "enter_name";
    conversations.set(phone, state);
    return "Perfecto! Ahora ingresá tu nombre completo.";
  }

  if (state.step === "enter_name") {
    if (text.trim().length < 2) {
      return "Por favor, ingresá tu nombre completo.";
    }
    state.clientName = text.trim();
    state.step = "confirm";
    conversations.set(phone, state);

    const service = await db.select().from(servicesTable).where(eq(servicesTable.id, state.serviceId!)).limit(1);
    const barber = await db.select().from(barbersTable).where(eq(barbersTable.id, state.barberId!)).limit(1);

    return `*Confirmá tu turno:*\n\nServicio: ${service[0]?.name}\nBarbero: ${barber[0]?.name}\nFecha: ${state.date}\nHorario: ${state.timeSlot}\nNombre: ${state.clientName}\n\nRespondé *SI* para confirmar o *NO* para cancelar.`;
  }

  if (state.step === "confirm") {
    if (msg === "si" || msg === "sí" || msg === "s") {
      await db.insert(appointmentsTable).values({
        barberId: state.barberId!,
        serviceId: state.serviceId!,
        clientName: state.clientName!,
        clientPhone: phone,
        date: state.date!,
        timeSlot: state.timeSlot!,
        status: "pending",
      });
      conversations.delete(phone);
      return `✅ *Tu turno está confirmado!*\n\nTe esperamos el *${state.date}* a las *${state.timeSlot}*.\n\nSi necesitás cancelar, respondé *CANCELAR*.\n\n✂️ Barber M.T`;
    } else if (msg === "no" || msg === "n") {
      conversations.delete(phone);
      return "Turno cancelado. Si querés sacar otro, mandá *hola*.";
    }
    return "Respondé *SI* para confirmar o *NO* para cancelar.";
  }

  if (msg === "cancelar") {
    conversations.delete(phone);
    return "Ok, entendido. Si querés sacar un turno nuevo, mandá *hola*.";
  }

  conversations.delete(phone);
  return "Mandá *hola* para sacar un turno.";
}

router.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    logger.info("WhatsApp webhook verified");
    res.status(200).send(challenge);
  } else {
    res.status(403).json({ error: "Forbidden" });
  }
});

router.post("/webhook", async (req, res) => {
  res.status(200).json({ status: "ok" });

  try {
    const body = req.body;
    if (body.object !== "whatsapp_business_account") return;

    for (const entry of body.entry ?? []) {
      for (const change of entry.changes ?? []) {
        for (const msg of change.value?.messages ?? []) {
          if (msg.type !== "text") continue;
          const phone = msg.from;
          const text = msg.text?.body ?? "";
          const reply = await handleMessage(phone, text);
          await sendWhatsAppMessage(phone, reply);
        }
      }
    }
  } catch (err) {
    logger.error({ err }, "Error processing WhatsApp webhook");
  }
});

export default router;
