#!/usr/bin/env bash
# Aplica migraciones + seed en bases PostgreSQL locales limpias y ejecuta las pruebas SQL.
# Requiere PGHOST/PGPORT/PGUSER apuntando a un servidor de pruebas (nunca a producción).
set -euo pipefail
cd "$(dirname "$0")/.."
status=0
for t in supabase/tests/0[1-9]_*.sql; do
  DB="nexphone_test_$(basename "$t" .sql | tr -cd 'a-z0-9_')"
  psql -qc "drop database if exists $DB" -c "create database $DB" >/dev/null 2>&1
  for f in supabase/tests/00_supabase_stub.sql supabase/migrations/*.sql supabase/seed.sql; do
    psql -d "$DB" -v ON_ERROR_STOP=1 -q -f "$f" >/dev/null 2>&1 || { echo "Error aplicando $f"; psql -d "$DB" -v ON_ERROR_STOP=1 -q -f "$f"; exit 1; }
  done
  echo "── $(basename "$t")"
  out=$(psql -d "$DB" -v ON_ERROR_STOP=1 -f "$t" 2>&1) || status=1
  echo "$out" | grep -E "OK:|FALLO|ERROR|PASARON|OK$" | sed 's/^psql:[^ ]* NOTICE:  //' || true
  psql -qc "drop database if exists $DB" >/dev/null 2>&1
done
[ $status -eq 0 ] && echo "TODAS LAS PRUEBAS SQL PASARON" || { echo "HAY PRUEBAS FALLIDAS"; exit 1; }
