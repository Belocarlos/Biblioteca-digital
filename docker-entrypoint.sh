#!/bin/sh
# Aplica as migrações (quando MIGRATION_DATABASE_URL está definida) e inicia o servidor.
set -e
if [ -n "$MIGRATION_DATABASE_URL" ] && [ "${SKIP_MIGRATIONS:-false}" != "true" ]; then
  node scripts/migrate.mts
fi
exec "$@"
