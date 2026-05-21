import { pgTable, serial, integer, boolean } from "drizzle-orm/pg-core";

export const scheduleTable = pgTable("schedule", {
  id: serial("id").primaryKey(),
  dayOfWeek: integer("day_of_week").notNull().unique(), // 0=Dom, 1=Lun ... 6=Sáb
  enabled: boolean("enabled").notNull().default(true),
  startHour: integer("start_hour").notNull().default(9),
  endHour: integer("end_hour").notNull().default(20),
});

export type Schedule = typeof scheduleTable.$inferSelect;
