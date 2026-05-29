import sqlite3 from 'sqlite3';

const db = new sqlite3.Database('../../sqlite.db');

db.serialize(() => {
  // Alter schedule table
  db.run("ALTER TABLE schedule RENAME COLUMN start_hour TO start_time;", (err) => {
    if (err) console.error("Error renaming start_hour:", err.message);
    else console.log("Renamed start_hour to start_time");
  });
  db.run("ALTER TABLE schedule RENAME COLUMN end_hour TO end_time;", (err) => {
    if (err) console.error("Error renaming end_hour:", err.message);
    else console.log("Renamed end_hour to end_time");
  });

  // Alter appointments table
  db.run("ALTER TABLE appointments ADD COLUMN reminder_sent INTEGER NOT NULL DEFAULT 0;", (err) => {
    if (err) console.error("Error adding reminder_sent:", err.message);
    else console.log("Added reminder_sent to appointments");
  });
});

db.close();
