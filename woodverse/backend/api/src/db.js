import { readdir, readFile } from "node:fs/promises";
import dns from "node:dns";
import { fileURLToPath } from "node:url";
import { Pool } from "pg";

dns.setDefaultResultOrder("ipv4first");

const databaseUrl = process.env.DATABASE_URL;
const useSsl = process.env.DB_SSL === "true";
const sslConfig = useSsl ? { rejectUnauthorized: false } : undefined;

function buildCandidates(rawUrl) {
  if (!rawUrl) return [];
  try {
    const parsed = new URL(rawUrl);
    const userInfo = rawUrl.includes(parsed.username)
      ? `${encodeURIComponent(decodeURIComponent(parsed.username))}:${encodeURIComponent(decodeURIComponent(parsed.password || ""))}@`
      : "";
    const basePath = `${parsed.pathname}${parsed.search || ""}`;
    const dbName = parsed.pathname.replace(/^\//, "") || "postgres";
    const password = encodeURIComponent(decodeURIComponent(parsed.password || ""));
    const user = encodeURIComponent(decodeURIComponent(parsed.username || "postgres"));
    const portPool = parsed.port || "5432";
    const portDirect = parsed.port || "5432";

    const poolerHost = process.env.SUPABASE_POOLER_HOST;
    const candidates = [];

    if (poolerHost) {
      candidates.push(`postgres://${user}:${password}@${poolerHost}:6543/${dbName}`);
    }

    if (parsed.hostname.endsWith(".supabase.co")) {
      const ref = parsed.hostname.split(".")[0].replace(/^db\./, "");
      const regions = [
        "aws-0-ap-southeast-2",
        "aws-0-ap-southeast-1",
        "aws-0-ap-south-1",
        "aws-0-ap-northeast-1",
        "aws-0-us-east-1",
        "aws-0-us-west-1",
        "aws-0-eu-west-1",
        "aws-0-eu-central-1",
        "aws-0-sa-east-1",
      ];
      for (const region of regions) {
        candidates.push(`postgres://postgres.${ref}:${password}@${region}.pooler.supabase.com:6543/${dbName}`);
        candidates.push(`postgres://postgres.${ref}:${password}@${region}.pooler.supabase.com:5432/${dbName}`);
      }
    }

    candidates.push(rawUrl);
    return candidates;
  } catch (error) {
    return [rawUrl];
  }
}

function createPool(connectionString) {
  return new Pool({
    connectionString,
    max: Number(process.env.DB_POOL_SIZE || 5),
    ssl: sslConfig,
    family: 4,
    connectionTimeoutMillis: 8000,
    idleTimeoutMillis: 30000,
  });
}

async function pickWorkingPool(candidates) {
  let lastError = null;
  for (const candidate of candidates) {
    const testPool = createPool(candidate);
    try {
      const client = await Promise.race([
        testPool.connect(),
        new Promise((_, reject) => setTimeout(() => reject(new Error("connect timeout")), 8000)),
      ]);
      await client.query("SELECT 1");
      client.release();
      await testPool.end().catch(() => {});
      console.log(`[db] Connected using ${candidate.replace(/:[^:@]+@/, ":***@")}`);
      return createPool(candidate);
    } catch (error) {
      lastError = error;
      await testPool.end().catch(() => {});
      console.warn(`[db] Candidate failed: ${error.message}`);
    }
  }
  throw lastError || new Error("No working database connection");
}

export const databaseConfigured = Boolean(databaseUrl);
let activePool = null;
let poolReady = null;

if (databaseConfigured) {
  const candidates = buildCandidates(databaseUrl);
  poolReady = pickWorkingPool(candidates)
    .then((pool) => {
      activePool = pool;
      return pool;
    })
    .catch((error) => {
      console.error(`[db] All connection candidates failed: ${error.message}`);
      activePool = createPool(databaseUrl);
      return activePool;
    });
}

export function getPool() {
  return activePool;
}

export async function query(text, values = []) {
  if (!databaseConfigured) throw new Error("DATABASE_URL is not configured");

  // Requests can arrive before the pool has finished connecting, so wait for it here.
  // Without this the first request after boot throws "DATABASE_URL is not configured".
  if (poolReady) await poolReady;

  const pool = getPool();
  if (!pool) throw new Error("DATABASE_URL is not configured");
  return pool.query(text, values);
}

export async function initializeDatabase() {
  if (!databaseConfigured) return { configured: false, initialized: false };
  await poolReady;
  const pool = getPool();
  try {
    const migrationsDir = new URL("./migrations/", import.meta.url);
    await pool.query(
      "CREATE TABLE IF NOT EXISTS _migrations (id SERIAL PRIMARY KEY, name TEXT NOT NULL UNIQUE, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW())"
    );
    const applied = new Set(
      (await pool.query("SELECT name FROM _migrations ORDER BY id")).rows.map((r) => r.name)
    );
    const files = (await readdir(fileURLToPath(migrationsDir))).filter((f) => f.endsWith(".sql")).sort();
    for (const file of files) {
      if (applied.has(file)) continue;
      const sql = await readFile(fileURLToPath(new URL(file, migrationsDir)), "utf8");
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query(sql);
        await client.query("INSERT INTO _migrations (name) VALUES ($1)", [file]);
        await client.query("COMMIT");
        console.log("[db] Migration applied:", file);
      } catch (err) {
        await client.query("ROLLBACK").catch(() => {});
        console.error("[db] Migration failed:", file, err.message);
        throw err;
      } finally {
        client.release();
      }
    }
  } catch (err) {
    console.error("[db] initializeDatabase error:", err.message);
  }
  return { configured: true, initialized: true };
}
