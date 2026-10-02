#!/usr/bin/env bash
# Sangham Library: local migration + RLS test runner.
# Requires a local PostgreSQL 15+ superuser connection (default: postgres).
# Usage: ./run_local_tests.sh [database_name]
set -euo pipefail

DB="${1:-sangham_library_test}"
PSQL="psql -X -q -v ON_ERROR_STOP=1"
RUN_AS="${PGUSER_OVERRIDE:-postgres}"

here="$(cd "$(dirname "$0")" && pwd)"
mig="$here/../migrations"

# SQL is piped via stdin so the postgres OS user never needs read access to
# the repository checkout.
run() { su "$RUN_AS" -c "$PSQL -d $1" < "$2" 2>&1 || { echo "FAILED: $2"; exit 1; }; }

echo "== Recreating $DB =="
su "$RUN_AS" -c "psql -X -q -c 'drop database if exists $DB' -c 'create database $DB'"

echo "== Applying local Supabase emulation stub =="
run "$DB" "$here/local_auth_stub.sql"

echo "== Applying migrations =="
for f in "$mig"/*.sql; do
  echo "   -> $(basename "$f")"
  run "$DB" "$f"
done

echo "== Running RLS test suite =="
run "$DB" "$here/rls_tests.sql"

echo "== OK: all migrations applied and RLS tests passed =="
