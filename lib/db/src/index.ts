import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import path from "path";
import * as schema from "./schema";

const sqlite = createClient({ url: "file:" + path.join(__dirname, "../../../sqlite.db").replace(/\\/g, "/") });
export const db = drizzle(sqlite, { schema });

export * from "./schema";
