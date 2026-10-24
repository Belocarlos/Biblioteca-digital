#!/usr/bin/env bash
# Cópia de segurança da base de dados e dos ficheiros (armazenamento local).
#
# Utilização: scripts/backup.sh [pasta_de_destino]
# Requer: pg_dump (versão igual ou superior à do servidor) e MIGRATION_DATABASE_URL.
# Com STORAGE_DRIVER=s3, os ficheiros devem ser protegidos com o versionamento
# ou a replicação do próprio serviço de armazenamento.
set -euo pipefail

if [ -z "${MIGRATION_DATABASE_URL:-}" ] && [ -f .env.local ]; then set -a; . ./.env.local; set +a; fi
: "${MIGRATION_DATABASE_URL:?MIGRATION_DATABASE_URL não está definida}"

DEST="${1:-./backups}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$DEST"
chmod 700 "$DEST"

pg_dump --format=custom --no-owner --file "$DEST/ol4-db-$STAMP.dump" "$MIGRATION_DATABASE_URL"
echo "Base de dados: $DEST/ol4-db-$STAMP.dump"

if [ "${STORAGE_DRIVER:-local}" = "local" ] && [ -d "${STORAGE_LOCAL_DIR:-./storage}" ]; then
  tar -czf "$DEST/ol4-ficheiros-$STAMP.tar.gz" -C "${STORAGE_LOCAL_DIR:-./storage}" .
  echo "Ficheiros: $DEST/ol4-ficheiros-$STAMP.tar.gz"
fi

# Mantém as 30 cópias mais recentes de cada tipo.
ls -1t "$DEST"/ol4-db-*.dump 2>/dev/null | tail -n +31 | xargs -r rm -- || true
ls -1t "$DEST"/ol4-ficheiros-*.tar.gz 2>/dev/null | tail -n +31 | xargs -r rm -- || true
