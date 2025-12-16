import { createClient } from "@libsql/client";

const tursoDBUrl = process.env.TURSO_DB_URL;
const authToken = process.env.TURSO_DB_AUTH_TOKEN;

if (!tursoDBUrl || !authToken) {
  throw new Error(
    "Missing Turso database URL or Auth Token in environment variables. Check .env file and process.env names."
  );
}

const client = createClient({
  url: tursoDBUrl,
  authToken: authToken,
});

export async function initializeDatabase() {
  try {
    await client.execute(`
      CREATE TABLE IF NOT EXISTS scores (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        time REAL NOT NULL
      )
    `);
  } catch (error) {
    console.error("Error initializing database schema:", error);
    process.exit(1);
  }
}

export default client;
