import { pgTable, text, serial, boolean, timestamp } from "drizzle-orm/pg-core";

export const botSettingsTable = pgTable("bot_settings", {
  id: serial("id").primaryKey(),
  welcomeMessage: text("welcome_message").notNull().default(`💈 *BARBER M.T* 💈\n\n¡Bienvenido!\nSoy el asistente de reservas de BARBER M.T.\n\n📅 *RESERVAR* → Solicitar un turno\n❌ *CANCELAR* → Cancelar una reserva\n👀 *MIS TURNOS* → Consultar tus turnos\n\n📍Gracias por elegir BARBER M.T.`),
  confirmationMessage: text("confirmation_message").notNull().default(`✅ *¡TURNO CONFIRMADO - BARBER M.T!*\n\n👤 Cliente: {cliente}\n📅 Fecha: {fecha}\n⏰ Hora: {hora}\n💈 Servicio: {servicio}\n👨‍💼 Barbero: {barbero}\n💵 Precio: \${precio}\n\n¡Te esperamos! Para cambios escribinos nuevamente. 💈`),
  cancellationMessage: text("cancellation_message").notNull().default(`✅ Tu turno del *{fecha}* a las *{hora}* fue cancelado.`),
  notificationsEnabled: boolean("notifications_enabled").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
