#!/usr/bin/env bash
# Mostra o Magic Link mais recente do log do PocketBase (útil sem SMTP).
#
# Uso:
#   ./scripts/magic-link.sh                 # último link de qualquer e-mail
#   ./scripts/magic-link.sh voce@email.com  # último link de um e-mail
set -euo pipefail

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
COMPOSE="$ROOT_DIR/docker/docker-compose.tunnel.yml"
EMAIL="${1:-}"

RAW=$(docker compose -f "$COMPOSE" logs --no-log-prefix pocketbase 2>&1 \
  | grep '"event":"MAGIC_LINK"' || true)

if [ -n "$EMAIL" ]; then
  RAW=$(printf '%s\n' "$RAW" | grep -- "$EMAIL" || true)
fi

LINE=$(printf '%s\n' "${RAW:-}" | tail -n1)

if [ -z "$LINE" ]; then
  echo "Nenhum Magic Link encontrado no log. Peça um link e tente de novo." >&2
  exit 1
fi

printf '%s\n' "$LINE" | python3 -c '
import sys, json, re
line = sys.stdin.read()
m = re.search(r"\{.*\}", line)
data = json.loads(m.group(0)) if m else {}
print(data.get("link") or line.strip())
'
