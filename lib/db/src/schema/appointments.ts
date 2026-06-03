import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { barbersTable } from "./barbers";
import { servicesTable } from "./services";

export const appointmentsTable = pgTable("appointments", {
  id: serial("id").primaryKey(),
  barberId: integer("barber_id").notNull().references(() => barbersTable.id),
  serviceId: integer("service_id").notNull().references(() => servicesTable.id),
  clientName: text("client_name").notNull(),
  clientPhone: text("client_phone").notNull(),
  date: text("date").notNull(),
  timeSlot: text("time_slot").notNull(),
  status: text("status").notNull().default("pending"),
  reminderSent: boolean("reminder_sent").notNull().default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertAppointmentSchema = createInsertSchema(appointmentsTable).omit({ id: true, createdAt: true });
export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;
export type Appointment = typeof appointmentsTable.$inferSelect;
