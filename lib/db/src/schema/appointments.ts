import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { barbersTable } from "./barbers";
import { servicesTable } from "./services";
import { sql } from "drizzle-orm";

export const appointmentsTable = sqliteTable("appointments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  barberId: integer("barber_id").notNull().references(() => barbersTable.id),
  serviceId: integer("service_id").notNull().references(() => servicesTable.id),
  clientName: text("client_name").notNull(),
  clientPhone: text("client_phone").notNull(),
  date: text("date").notNull(),
  timeSlot: text("time_slot").notNull(),
  status: text("status").notNull().default("pending"),
  notes: text("notes"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(strftime('%s', 'now'))`),
});

export const insertAppointmentSchema = createInsertSchema(appointmentsTable).omit({ id: true, createdAt: true });
export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;
export type Appointment = typeof appointmentsTable.$inferSelect;
