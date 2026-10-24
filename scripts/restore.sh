#!/usr/bin/env bash
# Recuperação a partir de uma cópia de segurança. SUBSTITUI os dados atuais.
#
# Utilização: scripts/restore.sh <ficheiro.dump> [ficheiros.tar.gz]
set -euo pipefail

if [ -z "${MIGRATION_DATABASE_URL:-}" ] && [ -f .env.local ]; then set -a; . ./.env.local; set +a; fi
: "${MIGRATION_DATABASE_URL:?MIGRATION_DATABASE_URL não está definida}"
DUMP="${1:?Indique o ficheiro .dump}"
FILES="${2:-}"

read -r -p "Esta operação substitui os dados atuais. Escreva RECUPERAR para continuar: " CONFIRM
[ "$CONFIRM" = "RECUPERAR" ] || { echo "Operação cancelada."; exit 1; }

# As extensões (unaccent, pg_trgm, citext) são geridas pelo servidor e não são recriadas.
LIST="$(mktemp)"
trap 'rm -f "$LIST"' EXIT
pg_restore --list "$DUMP" | grep -v " EXTENSION " > "$LIST"
psql "$MIGRATION_DATABASE_URL" -v ON_ERROR_STOP=1 -q -c "create extension if not exists unaccent; create extension if not exists pg_trgm; create extension if not exists citext;"
pg_restore --clean --if-exists --no-owner --single-transaction --use-list "$LIST" --dbname "$MIGRATION_DATABASE_URL" "$DUMP"
echo "Base de dados recuperada."

if [ -n "$FILES" ]; then
  TARGET="${STORAGE_LOCAL_DIR:-./storage}"
  mkdir -p "$TARGET"
  tar -xzf "$FILES" -C "$TARGET"
  echo "Ficheiros recuperados em $TARGET."
fi
echo "Execute npm run db:migrate para garantir que o esquema está atualizado."
