import cron from "node-cron";
import { db, appointmentsTable, barbersTable, servicesTable } from "@workspace/db";
import { eq, and, sql, or } from "drizzle-orm";

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

/** Retorna la hora y minutos actuales en zona horaria de Argentina (UTC-3) */
function getNowArgentina(): { today: string; currentMinutes: number } {
  const now = new Date();
  // Argentina es UTC-3 fijo (sin cambio de horario)
  const offset = -3 * 60; // minutos
  const localMs = now.getTime() + offset * 60 * 1000;
  const local = new Date(localMs);
  const yyyy = local.getUTCFullYear();
  const mm = String(local.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(local.getUTCDate()).padStart(2, "0");
  const today = `${yyyy}-${mm}-${dd}`;
  const currentMinutes = local.getUTCHours() * 60 + local.getUTCMinutes();
  return { today, currentMinutes };
}

function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function startCronJobs(): void {
  // Recordatorio 1 hora antes — corre cada 5 minutos
  cron.schedule("*/5 * * * *", async () => {
    const { today, currentMinutes } = getNowArgentina();

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
        })
        .from(appointmentsTable)
        .leftJoin(barbersTable, eq(appointmentsTable.barberId, barbersTable.id))
        .leftJoin(servicesTable, eq(appointmentsTable.serviceId, servicesTable.id))
        .where(
          and(
            eq(appointmentsTable.date, today),
            eq(appointmentsTable.reminderSent, false),
            or(
              sql`${appointmentsTable.status} = 'confirmed'`,
              sql`${appointmentsTable.status} = 'pending'`
            )
          )
        );

      for (const apt of appointments) {
        const aptMinutes = toMinutes(apt.timeSlot);
        const diff = aptMinutes - currentMinutes;
        // Enviar si faltan entre 55 y 65 minutos (ventana de 10 min cada 5 min)
        if (diff > 55 && diff <= 65) {
          const message =
            `✂️ *Barber M.T* — Recordatorio de turno\n\n` +
            `Hola ${apt.clientName.split(" ")[0]}! Te recordamos que tenés turno en 1 hora.\n\n` +
            `📅 Hoy a las *${apt.timeSlot}*\n` +
            `💈 Servicio: ${apt.serviceName ?? "Turno"}\n\n` +
            `¡Te esperamos! Si necesitás cancelar, escribí CANCELAR.`;

          await sendWhatsApp(apt.clientPhone, message);
          console.log(`[Cron] Recordatorio enviado → ${apt.clientName} (${apt.timeSlot}) | Hora actual: ${Math.floor(currentMinutes/60)}:${String(currentMinutes%60).padStart(2,'0')}`);
          
          await db.update(appointmentsTable)
            .set({ reminderSent: true })
            .where(eq(appointmentsTable.id, apt.id));
        }
      }
    } catch (e) {
      console.error("[Cron] Error en recordatorios:", e);
    }
  });

  console.log("[Cron] Jobs de recordatorios activos ✓");
}
