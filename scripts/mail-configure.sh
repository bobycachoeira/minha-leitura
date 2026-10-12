#!/usr/bin/env bash
# Aplica as credenciais SMTP do docker/.env.tunnel nas settings do PocketBase
# (via API), para o Magic Link/convites saírem por e-mail. Rode após editar o .env.
set -euo pipefail

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
ENV_FILE="$ROOT_DIR/docker/.env.tunnel"
[ -f "$ENV_FILE" ] || { echo "Não encontrei $ENV_FILE" >&2; exit 1; }

set -a
# shellcheck disable=SC1090
. "$ENV_FILE"
set +a

B="${CF_LOCAL_URL:-http://127.0.0.1:8080}"
ADMIN=$(curl -s -X POST "$B/api/collections/_superusers/auth-with-password" \
  -H 'Content-Type: application/json' \
  -d "{\"identity\":\"${CF_POCKETBASE_ADMIN_EMAIL}\",\"password\":\"${CF_POCKETBASE_ADMIN_PASSWORD}\"}" \
  | sed -E 's/.*"token":"([^"]+)".*/\1/')

if [ -z "$ADMIN" ] || [ "$ADMIN" = "null" ]; then
  echo "Falha ao autenticar superusuário (confira CF_POCKETBASE_ADMIN_*)." >&2
  exit 1
fi

BODY=$(python3 -c "
import json, os
print(json.dumps({'smtp': {
  'enabled': True,
  'host': os.environ.get('CF_MAIL_HOST',''),
  'port': int(os.environ.get('CF_MAIL_PORT','587')),
  'username': os.environ.get('CF_MAIL_USER',''),
  'password': os.environ.get('CF_MAIL_PASS',''),
  'tls': os.environ.get('CF_MAIL_TLS','false') == 'true',
  'authMethod': ''
}}))
")

curl -s -X PATCH "$B/api/settings" -H "Authorization: Bearer $ADMIN" \
  -H 'Content-Type: application/json' -d "$BODY" \
  | python3 -c "
import sys, json
s = json.load(sys.stdin).get('smtp', {})
print(f\"SMTP aplicado -> enabled={s.get('enabled')} host={s.get('host')} port={s.get('port')} user={s.get('username')} tls={s.get('tls')}\")
"
