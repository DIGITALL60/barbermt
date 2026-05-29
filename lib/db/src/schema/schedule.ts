import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";

export const scheduleTable = sqliteTable("schedule", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  dayOfWeek: integer("day_of_week").notNull().unique(), // 0=Dom, 1=Lun ... 6=Sáb
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  startTime: text("start_time").notNull().default("09:00"),
  endTime: text("end_time").notNull().default("20:00"),
});

export type Schedule = typeof scheduleTable.$inferSelect;
