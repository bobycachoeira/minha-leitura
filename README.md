# Minha Leitura

PWA offline-first para rastrear leituras do casal, com metas de páginas/livros,
conquistas compartilháveis, feed social leve e recomendações.

## Stack

- **Frontend**: Vue 3 + Vite + TypeScript (strict), Tailwind CSS, Dexie.js (IndexedDB).
- **Backend**: PocketBase self-host (collections + hooks JS).
- **Contrato**: pacote `@ml/shared` (Zod + regras puras de período/meta/progresso).
- **Sync**: `POST /api/sync/push` e `GET /api/sync/pull?since=<cursor>` (idempotente por `sync_id`).

## Pré-requisitos

- Node.js 20 LTS + pnpm 9+
- Binário do PocketBase 0.23+ em `apps/pocketbase/pocketbase` (não versionado)
- Docker + Docker Compose (opcional, para o túnel de teste)

## Setup

```bash
pnpm install
pnpm build:hooks                 # gera apps/pocketbase/pb_hooks/lib/shared.js (versionado)

cp apps/pocketbase/.env.example apps/pocketbase/.env
cp apps/web/.env.example apps/web/.env.local
```

## Manutenção

- **`apps/pocketbase/pb_hooks/lib/shared.js` é gerado** por `pnpm build:hooks` a partir de
  `packages/shared` e fica **versionado** (o Docker do PocketBase copia os hooks direto, sem
  rodar o build do monorepo). **Ao alterar `packages/shared`, rode `pnpm build:hooks` e faça
  commit do arquivo gerado** — senão os hooks de produção usam uma versão antiga do domínio.

## Comandos do monorepo

| Comando | Escopo |
|---------|--------|
| `pnpm dev:web` | Frontend (Vite) |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | TypeScript (strict) |
| `pnpm test:shared` | Regras puras (`@ml/shared`) |
| `pnpm test:web` | Dexie/stores (fake-indexeddb) |
| `pnpm test:contract` | Schemas vs. API |
| `pnpm test:pb` | Integração PocketBase efêmera |
| `pnpm test:e2e` | Playwright |
| `pnpm build:hooks` | Bundle do domínio para os hooks |

## Fluxo SDD

Ver `COMANDOS.md` (`constitution → specify → (clarify) → plan → tasks →
(analyze/checklist) → implement → converge`) e os artefatos em
`specs/001-leitura-metas/`.

## Teste via Cloudflare Tunnel (recomendado)

Igual ao `controle-financeiro`: sobe tudo localmente e publica numa URL HTTPS grátis
(`https://<aleatorio>.trycloudflare.com`), sem abrir portas no roteador.

```bash
cp docker/.env.tunnel.example docker/.env.tunnel   # defina CF_ENCRYPTION_KEY e CF_ADMIN_EMAIL
./scripts/tunnel-up.sh                             # build + up + mostra a URL
```

- **Primeiro acesso**: informe o e-mail definido em `CF_ADMIN_EMAIL`; a conta é criada
  automaticamente. Sem SMTP, o **Magic Link não é enviado por e-mail** — ele aparece no
  log do PocketBase: `./scripts/magic-link.sh` (ou `... logs -f pocketbase | grep MAGIC_LINK`).
  Com SMTP configurado, aplique com `./scripts/mail-configure.sh` e o link chega por e-mail.
- **Painel admin**: `<URL>/_/` (crie o superusuário com
  `docker compose -f docker/docker-compose.tunnel.yml exec pocketbase /pb/pocketbase superuser upsert EMAIL SENHA --dir=/pb/pb_data`).
- **Parar**: `docker compose -f docker/docker-compose.tunnel.yml down` (adicione `-v` para apagar o banco).

### Publicação estável (Tailscale Funnel)

Alternativa ao quick tunnel, com URL fixa e sem cloudflared:

```bash
./scripts/tailscale-up.sh    # instala/autentica o Tailscale e liga o Funnel na :8080
```

### Notificações push (Web Push)

Serviço opcional `notifier` (perfil `notifier`). Preencha `CF_VAPID_*` (par de chaves VAPID) e
`CF_POCKETBASE_ADMIN_*` no `.env.tunnel`, depois:

```bash
docker compose --env-file docker/.env.tunnel -f docker/docker-compose.tunnel.yml --profile notifier up -d
```

Ele entrega eventos (curtidas/comentários/seguidores/novidades/fechamento de período) e o
lembrete diário, respeitando as preferências de cada usuário (Perfil → Notificações).

## Operação & recursos implementados

- **Acesso**: Magic Link de uso único + TOTP 2FA com step-up; espaços do casal e
  convites com RBAC (`owner|partner|viewer`) e auditoria em `audit_logs`.
- **Offline-first**: escritas em Dexie + Outbox; `POST /api/sync/push` idempotente por
  `sync_id` com LWW sinalizado (`conflict=true`); `GET /api/sync/pull` por delta com soft
  deletes espelhados localmente.
- **Metas**: páginas/livros por dia/semana/mês com compensação, dia de início e graça;
  fechamento imutável por cron e reabertura auditada por `owner|partner`.
- **Acervo**: estante em grid com capas, placeholder determinístico e cache LRU; catálogo
  externo Open Library (≤ 10 resultados, TTL de 30 dias, degradação offline).
- **Conquistas, dashboard, feed e desafios** com recomendações determinísticas.
- **Testes**: `pnpm test:shared | test:web | test:contract`; `pnpm test:pb` e `test:e2e`
  rodam quando o binário do PocketBase / navegadores estão disponíveis.
- **Operação**: `apps/pocketbase` (Docker) + `apps/web` (Docker estático via nginx) e
  `apps/notifier` para Web Push; publicação de teste via `scripts/tunnel-up.sh`.
