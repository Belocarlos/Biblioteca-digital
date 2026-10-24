#!/usr/bin/env bash
# Recria uma base de dados local de desenvolvimento ou de testes (APAGA TODOS OS DADOS).
# Utilização: scripts/reset-db.sh <nome_da_base>
set -euo pipefail
DB="${1:?Indique o nome da base de dados}"
case "$DB" in ol4|ol4_test|ol4_dev) ;; *) echo "Por segurança, apenas ol4, ol4_dev ou ol4_test."; exit 1;; esac
sudo -u postgres psql -v ON_ERROR_STOP=1 -q <<SQL
drop database if exists $DB with (force);
create database $DB owner ol4_owner;
\c $DB
create extension if not exists unaccent;
create extension if not exists pg_trgm;
create extension if not exists citext;
SQL
