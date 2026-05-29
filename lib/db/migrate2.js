import { createClient } from "@libsql/client";

const client = createClient({ url: "file:../../sqlite.db" });

async function migrate() {
  try {
    await client.execute("ALTER TABLE schedule RENAME COLUMN start_hour TO start_time;");
    console.log("Renamed start_hour to start_time");
  } catch (e) {
    console.error("Error start_time:", e.message);
  }
  
  try {
    await client.execute("ALTER TABLE schedule RENAME COLUMN end_hour TO end_time;");
    console.log("Renamed end_hour to end_time");
  } catch (e) {
    console.error("Error end_time:", e.message);
  }

  try {
    await client.execute("ALTER TABLE appointments ADD COLUMN reminder_sent INTEGER NOT NULL DEFAULT 0;");
    console.log("Added reminder_sent");
  } catch (e) {
    console.error("Error reminder_sent:", e.message);
  }

  // Need to update the data so it conforms to the text strings instead of integers
  // startHour/endHour were integers. we rename them, now they are start_time/end_time.
  // Wait, if they were integers like 9, we should update them to "09:00".
  try {
    // We update to "HH:00" format where possible
    await client.execute(`UPDATE schedule SET start_time = printf('%02d:00', start_time) WHERE typeof(start_time) = 'integer' OR start_time NOT LIKE '%:%'`);
    await client.execute(`UPDATE schedule SET end_time = printf('%02d:00', end_time) WHERE typeof(end_time) = 'integer' OR end_time NOT LIKE '%:%'`);
    console.log("Updated data to string formats");
  } catch(e) {
    console.error("Error updating format:", e.message);
  }
}

migrate();
