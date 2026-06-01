import { readFileSync } from "fs";
import { neon } from "@neondatabase/serverless";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Parse .env.local
const envFile = readFileSync(resolve(__dirname, "../apps/coordinator/.env.local"), "utf8");
const env = Object.fromEntries(
  envFile.split("\n")
    .filter(l => l && !l.startsWith("#"))
    .map(l => l.split("=").map((p, i) => i === 0 ? p.trim() : l.slice(l.indexOf("=") + 1).trim().replace(/^"|"$/g, "")))
    .filter(([k]) => k)
);

const dbUrl = env.DATABASE_URL_UNPOOLED || env.DATABASE_URL;
if (!dbUrl) {
  console.error("No DATABASE_URL found in .env.local");
  process.exit(1);
}

const schema = readFileSync(resolve(__dirname, "../apps/coordinator/db/schema.sql"), "utf8");
const sql = neon(dbUrl);

// Split into individual statements (skip empty ones)
const statements = schema
  .split(";")
  .map(s => s.trim())
  .filter(s => s.length > 0);

console.log(`Applying ${statements.length} statements to Neon database...`);
for (const stmt of statements) {
  await sql.query(stmt + ";");
}
console.log("Schema applied successfully.");
