import { Router } from "express";
import { db, botSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

const DEFAULT_SETTINGS = {
  welcomeMessage: `💈 *BARBER M.T* 💈\n\n¡Bienvenido!\nSoy el asistente de reservas de BARBER M.T.\n\n📅 *RESERVAR* → Solicitar un turno\n❌ *CANCELAR* → Cancelar una reserva\n👀 *MIS TURNOS* → Consultar tus turnos\n\n📍Gracias por elegir BARBER M.T.`,
  confirmationMessage: `✅ *¡TURNO CONFIRMADO - BARBER M.T!*\n\n👤 Cliente: {cliente}\n📅 Fecha: {fecha}\n⏰ Hora: {hora}\n💈 Servicio: {servicio}\n👨‍💼 Barbero: {barbero}\n💵 Precio: \${precio}\n\n¡Te esperamos! Para cambios escribinos nuevamente. 💈`,
  cancellationMessage: `✅ Tu turno del *{fecha}* a las *{hora}* fue cancelado.`,
  notificationsEnabled: true
};

// Get bot settings
router.get("/", async (req, res) => {
  try {
    let settings = await db.select().from(botSettingsTable).limit(1);
    
    if (settings.length === 0) {
      // Create default settings if none exist
      const newSettings = await db.insert(botSettingsTable).values(DEFAULT_SETTINGS).returning();
      return res.json(newSettings[0]);
    }
    
    // Fix existing empty rows
    if (!settings[0].welcomeMessage || settings[0].welcomeMessage.includes("\\n")) {
      const updated = await db.update(botSettingsTable)
        .set(DEFAULT_SETTINGS)
        .where(eq(botSettingsTable.id, settings[0].id))
        .returning();
      return res.json(updated[0]);
    }
    
    res.json(settings[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update bot settings
router.put("/", async (req, res) => {
  try {
    const { welcomeMessage, confirmationMessage, cancellationMessage, notificationsEnabled } = req.body;
    
    let settings = await db.select().from(botSettingsTable).limit(1);
    
    if (settings.length === 0) {
      settings = await db.insert(botSettingsTable).values({}).returning();
    }
    
    const updated = await db.update(botSettingsTable)
      .set({
        welcomeMessage,
        confirmationMessage,
        cancellationMessage,
        notificationsEnabled,
        updatedAt: new Date()
      })
      .where(eq(botSettingsTable.id, settings[0].id))
      .returning();
      
    res.json(updated[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Proxy to get QR and status from whatsapp-bot
router.get("/status", async (req, res) => {
  try {
    const botUrl = process.env.BOT_URL || "http://localhost:3000";
    const response = await fetch(`${botUrl}/api/status`);
    if (!response.ok) throw new Error("Failed to fetch bot status");
    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ status: "desconectado", error: error.message });
  }
});

// Proxy to disconnect bot
router.post("/disconnect", async (req, res) => {
  try {
    const botUrl = process.env.BOT_URL || "http://localhost:3000";
    const response = await fetch(`${botUrl}/api/disconnect`, { method: "POST" });
    if (!response.ok) throw new Error("Failed to disconnect bot");
    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
