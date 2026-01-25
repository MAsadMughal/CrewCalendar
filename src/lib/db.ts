import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@shared/schema";

// Fix for "self-signed certificate in certificate chain" error
// when using managed databases that require SSL but don't have a public CA
let connectionString = process.env.DATABASE_URL;

if (connectionString) {
  try {
    const url = new URL(connectionString);
    // Remove sslmode=require if present to avoid conflicting with our manual ssl config
    // which sets rejectUnauthorized: false
    if (url.searchParams.has("sslmode")) {
      url.searchParams.delete("sslmode");
    }
    connectionString = url.toString();
  } catch (e) {
    // If URL parsing fails, fall back to the original string
    console.warn("Failed to parse DATABASE_URL, using original", e);
  }
}

if (!process.env.DATABASE_URL) {
  throw new Error("config.DATABASE_URL is missing");
}

const url = new URL(process.env.DATABASE_URL);

const pool = new Pool({
  host: url.hostname,
  port: parseInt(url.port || "5432"),
  user: url.username,
  password: url.password,
  database: url.pathname.slice(1),
  ssl: {
    rejectUnauthorized: false,
  },
});

export const db = drizzle(pool, { schema });
