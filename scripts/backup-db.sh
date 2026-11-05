#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "Defina DATABASE_URL antes de gerar o backup." >&2
  exit 1
fi

if ! command -v pg_dump >/dev/null 2>&1; then
  echo "pg_dump não encontrado. Instale o cliente PostgreSQL." >&2
  exit 1
fi

out_dir="${1:-./backups}"
mkdir -p "$out_dir"
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
file="$out_dir/ordexa-$stamp.dump"
connection="${DATABASE_URL%%\?*}"

pg_dump "$connection" --format=custom --no-owner --file="$file"
echo "Backup criado em $file"
echo "Para restaurar: pg_restore --clean --if-exists --no-owner -d \"$connection\" \"$file\""
