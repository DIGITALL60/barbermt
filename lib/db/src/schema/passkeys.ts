import { pgTable, text, varchar, integer, timestamp, serial } from "drizzle-orm/pg-core";

export const passkeysTable = pgTable("passkeys", {
  id: serial("id").primaryKey(),
  credentialId: text("credential_id").notNull().unique(),
  publicKey: text("public_key").notNull(), // Almacenado como Base64
  counter: integer("counter").notNull(),
  transports: text("transports").notNull(), // JSON string array
  userId: varchar("user_id", { length: 255 }).notNull().default("admin"),
  name: varchar("name", { length: 255 }).notNull().default("Dispositivo"), // e.g., "iPhone de Carlos"
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastUsedAt: timestamp("last_used_at"),
});
