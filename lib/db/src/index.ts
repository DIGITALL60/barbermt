import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  throw new Error("DATABASE_URL environment variable is required");
}

const queryClient = postgres(dbUrl, { prepare: false });
export const db = drizzle(queryClient, { schema });

export * from "./schema";
