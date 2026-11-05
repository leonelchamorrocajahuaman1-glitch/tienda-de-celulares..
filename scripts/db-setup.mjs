/**
 * NEXPHONE — Inicialización automática de la base de datos (no destructiva).
 *
 *  - Aplica en orden las migraciones de supabase/migrations que aún no se aplicaron
 *    (registro en nexphone_meta.schema_migrations). Todas son idempotentes.
 *  - Carga el catálogo inicial (seed.sql) SOLO si la tabla de productos está vacía.
 *  - Si ADMIN_EMAIL está definido, intenta promover esa cuenta a primer administrador
 *    (solo si no existe ningún admin y el correo está confirmado).
 *  - Verifica el esquema (tablas, funciones, RLS y buckets) y muestra un informe.
 *
 * Conexión: DATABASE_URL | POSTGRES_URL_NON_POOLING (la crea la integración Supabase de Vercel) | SUPABASE_DB_URL
 * Uso: node scripts/db-setup.mjs [--if-configured] [--no-seed]
 *   --if-configured  no falla si no hay cadena de conexión (para usarlo dentro del build).
 */
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = new Set(process.argv.slice(2));
const url = process.env.DATABASE_URL || process.env.POSTGRES_URL_NON_POOLING || process.env.SUPABASE_DB_URL;

if (!url) {
  const msg = "[db-setup] No hay cadena de conexión (DATABASE_URL / POSTGRES_URL_NON_POOLING / SUPABASE_DB_URL).";
  if (args.has("--if-configured")) {
    console.log(`${msg} Se omite la inicialización de la base de datos.`);
    process.exit(0);
  }
  console.error(msg);
  process.exit(1);
}

const u = new URL(url);
const local = ["localhost", "127.0.0.1", "::1"].includes(u.hostname) || u.hostname.startsWith("/");
u.searchParams.delete("sslmode");
u.searchParams.delete("supa");
u.searchParams.delete("pgbouncer");
// Conexión cifrada con Supabase (el certificado del pooler no está en el almacén público de Node)
const client = new pg.Client({
  connectionString: u.toString(),
  ssl: local ? false : { rejectUnauthorized: false },
  connectionTimeoutMillis: 20000,
});

const log = (...m) => console.log("[db-setup]", ...m);

async function main() {
  try {
    await client.connect();
  } catch (e) {
    const msg = `No se pudo conectar a ${u.hostname}: ${e.message}`;
    if (args.has("--if-configured")) {
      // En el build no se bloquea el despliegue por un problema de red; /api/health lo mostrará.
      console.warn(`[db-setup] AVISO: ${msg}. Se omite la inicialización; revisa POSTGRES_URL_NON_POOLING/DATABASE_URL.`);
      return;
    }
    throw new Error(msg);
  }
  log(`Conectado a ${u.hostname}`);
  await client.query(`create schema if not exists nexphone_meta;
    revoke all on schema nexphone_meta from public;
    create table if not exists nexphone_meta.schema_migrations (
      name text primary key, checksum text not null, applied_at timestamptz not null default now());`);

  const dir = join(root, "supabase", "migrations");
  const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
  const { rows } = await client.query("select name, checksum from nexphone_meta.schema_migrations");
  const applied = new Map(rows.map((r) => [r.name, r.checksum]));

  for (const f of files) {
    const sql = readFileSync(join(dir, f), "utf8");
    const sum = createHash("sha256").update(sql).digest("hex");
    if (applied.get(f) === sum) continue;
    log(`${applied.has(f) ? "Reaplicando (cambió)" : "Aplicando"} ${f}`);
    await client.query("begin");
    try {
      await client.query(sql);
      await client.query(
        `insert into nexphone_meta.schema_migrations (name, checksum) values ($1, $2)
         on conflict (name) do update set checksum = excluded.checksum, applied_at = now()`,
        [f, sum],
      );
      await client.query("commit");
    } catch (e) {
      await client.query("rollback");
      throw new Error(`Falló ${f}: ${e.message}`);
    }
  }

  if (!args.has("--no-seed")) {
    const { rows: c } = await client.query("select count(*)::int as n from public.products");
    const { rows: s } = await client.query("select 1 from nexphone_meta.schema_migrations where name = 'seed.sql'");
    if (c[0].n === 0 && s.length === 0) {
      log("Base vacía: cargando catálogo inicial (seed.sql)");
      await client.query(readFileSync(join(root, "supabase", "seed.sql"), "utf8"));
      await client.query("insert into nexphone_meta.schema_migrations (name, checksum) values ('seed.sql', 'once') on conflict do nothing");
    } else {
      log(`Catálogo existente (${c[0].n} productos): no se modifica`);
    }
  }

  if (process.env.ADMIN_EMAIL) {
    const { rows: r } = await client.query("select public.bootstrap_first_admin($1) as res", [process.env.ADMIN_EMAIL]);
    log(`Primer administrador: ${r[0].res}`);
  }

  const { rows: st } = await client.query("select public.nexphone_schema_status() as s");
  const s = st[0].s;
  const problems = [];
  if (s.tables !== s.tables_expected) problems.push(`tablas ${s.tables}/${s.tables_expected}`);
  if (s.functions !== s.functions_expected) problems.push(`funciones ${s.functions}/${s.functions_expected}`);
  if (s.rls_disabled.length) problems.push(`RLS desactivado en: ${s.rls_disabled.join(", ")}`);
  if (s.buckets.length !== 2) problems.push(`buckets de Storage: ${JSON.stringify(s.buckets)}`);
  log(`Estado: ${s.tables} tablas, ${s.functions} funciones, buckets ${JSON.stringify(s.buckets)}, ${s.products} productos, ${s.admins} administrador(es)`);
  if (problems.length) throw new Error(`Esquema incompleto: ${problems.join("; ")}`);
  log("Base de datos lista ✔");
}

main()
  .catch((e) => {
    console.error("[db-setup] ERROR:", e.message);
    process.exitCode = 1;
  })
  .finally(() => client.end().catch(() => {}));
