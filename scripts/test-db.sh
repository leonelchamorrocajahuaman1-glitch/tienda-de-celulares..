#!/usr/bin/env bash
# Aplica migraciones + seed en un PostgreSQL local limpio y ejecuta pruebas de seguridad.
# Requiere variables PGHOST/PGPORT/PGUSER apuntando a un servidor de pruebas.
set -euo pipefail
cd "$(dirname "$0")/.."
DB=${TEST_DB:-nexphone_test}
psql -qc "drop database if exists $DB" -c "create database $DB" >/dev/null
for f in supabase/tests/00_supabase_stub.sql supabase/migrations/*.sql supabase/seed.sql; do
  psql -d "$DB" -v ON_ERROR_STOP=1 -q -f "$f" >/dev/null 2>&1 || { echo "Error en $f"; psql -d "$DB" -v ON_ERROR_STOP=1 -q -f "$f"; exit 1; }
done
psql -d "$DB" -v ON_ERROR_STOP=1 -f supabase/tests/01_security_flow.sql 2>&1 | sed 's/^psql:[^ ]* NOTICE:  //'
