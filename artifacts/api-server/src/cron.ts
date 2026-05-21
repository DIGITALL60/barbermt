import cron from "node-cron";
import { db, appointmentsTable, barbersTable, servicesTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";

const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const WHATSAPP_PHONE_ID = process.env.WHATSAPP_PHONE_ID;

async function sendWhatsApp(phone: string, message: string): Promise<void> {
  if (!WHATSAPP_ACCESS_TOKEN || !WHATSAPP_PHONE_ID) {
    console.log(`[WhatsApp simulado] → ${phone}:\n${message}\n`);
    return;
  }
  try {
    const res = await fetch(
      `https://graph.facebook.com/v18.0/${WHATSAPP_PHONE_ID}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: phone.replace(/\D/g, ""),
          type: "text",
          text: { body: message },
        }),
      }
    );
    if (!res.ok) {
      const err = await res.text();
      console.error("[WhatsApp] Error:", err);
    } else {
      console.log(`[WhatsApp] Recordatorio enviado a ${phone}`);
    }
  } catch (e) {
    console.error("[WhatsApp] Error de red:", e);
  }
}

function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function startCronJobs(): void {
  // Recordatorio 1 hora antes — corre cada 5 minutos
  cron.schedule("*/5 * * * *", async () => {
    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    try {
      const appointments = await db
        .select({
          id: appointmentsTable.id,
          clientName: appointmentsTable.clientName,
          clientPhone: appointmentsTable.clientPhone,
          timeSlot: appointmentsTable.timeSlot,
          date: appointmentsTable.date,
          serviceName: servicesTable.name,
          barberName: barbersTable.name,
          reminderSent: sql<boolean>`${appointmentsTable.status} = 'reminder_sent'`,
        })
        .from(appointmentsTable)
        .leftJoin(barbersTable, eq(appointmentsTable.barberId, barbersTable.id))
        .leftJoin(servicesTable, eq(appointmentsTable.serviceId, servicesTable.id))
        .where(
          and(
            eq(appointmentsTable.date, today),
            sql`${appointmentsTable.status} = 'confirmed'`
          )
        );

      for (const apt of appointments) {
        const aptMinutes = toMinutes(apt.timeSlot);
        const diff = aptMinutes - currentMinutes;
        // Enviar si faltan entre 58 y 62 minutos
        if (diff >= 58 && diff <= 62) {
          const message =
            `✂️ *Barber M.T* — Recordatorio\n\n` +
            `Hola ${apt.clientName.split(" ")[0]}! Tu turno es en *1 hora*.\n\n` +
            `📅 Hoy a las *${apt.timeSlot}*\n` +
            `💈 Servicio: ${apt.serviceName ?? "Turno"}\n\n` +
            `¡Te esperamos! Para cancelar escribinos.`;

          await sendWhatsApp(apt.clientPhone, message);
          console.log(`[Cron] Recordatorio enviado → ${apt.clientName} (${apt.timeSlot})`);
        }
      }
    } catch (e) {
      console.error("[Cron] Error en recordatorios:", e);
    }
  });

  console.log("[Cron] Jobs de recordatorios activos ✓");
}
