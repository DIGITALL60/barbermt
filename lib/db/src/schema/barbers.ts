import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { sql } from "drizzle-orm";

export const barbersTable = sqliteTable("barbers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  bio: text("bio"),
  photoUrl: text("photo_url"),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(strftime('%s', 'now'))`),
});

export const insertBarberSchema = createInsertSchema(barbersTable).omit({ id: true, createdAt: true });
export type InsertBarber = z.infer<typeof insertBarberSchema>;
export type Barber = typeof barbersTable.$inferSelect;
