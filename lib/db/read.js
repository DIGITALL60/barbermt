import { createClient } from "@libsql/client";

const client = createClient({ url: "file:../../sqlite.db" });

async function read() {
  try {
    const res = await client.execute("SELECT * FROM schedule");
    console.log("SCHEDULE:");
    console.log(res.rows);
  } catch (e) {
    console.error("Error reading schedule:", e.message);
  }
}

read();
