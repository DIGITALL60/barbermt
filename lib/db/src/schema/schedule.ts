import { sqliteTable, integer } from "drizzle-orm/sqlite-core";

export const scheduleTable = sqliteTable("schedule", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  dayOfWeek: integer("day_of_week").notNull().unique(), // 0=Dom, 1=Lun ... 6=Sáb
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  startHour: integer("start_hour").notNull().default(9),
  endHour: integer("end_hour").notNull().default(20),
});

export type Schedule = typeof scheduleTable.$inferSelect;
