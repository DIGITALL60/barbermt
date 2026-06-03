import { pgTable, serial, integer, boolean, text } from "drizzle-orm/pg-core";

export const scheduleTable = pgTable("schedule", {
  id: serial("id").primaryKey(),
  dayOfWeek: integer("day_of_week").notNull().unique(), // 0=Dom, 1=Lun ... 6=Sáb
  enabled: boolean("enabled").notNull().default(true),
  startTime: text("start_time").notNull().default("09:00"),
  endTime: text("end_time").notNull().default("20:00"),
});

export type Schedule = typeof scheduleTable.$inferSelect;
