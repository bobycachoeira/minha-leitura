# Contracts — Minha Leitura

Contratos HTTP entre o PWA (`apps/web`) e o PocketBase (`apps/pocketbase`). Todos os
payloads são validados por Zod em `@ml/shared` no client **e** nos hooks do backend.

## Convenções

- Base: `/api` (o Cloudflare Tunnel roteia `/api/*` para o PocketBase).
- Auth: `Authorization: Bearer <token>`; ações sensíveis exigem `X-Step-Up-Token`.
- Datas de calendário: `YYYY-MM-DD`. Timestamps: ISO UTC.
- Erros: `{ "error": { "code": string, "message": string, "details"?: unknown } }`.
- Entidades sincronizáveis sempre trazem `id`, `space`, `sync_id`, `updatedBy`,
  `deletedAt`, `created`, `updated`.

## Arquivos

| Arquivo | Domínio |
|---------|---------|
| `auth-api.yaml` | Magic Link, 2FA step-up, sessão, dispositivos, espaços e convites |
| `reading-api.yaml` | Acervo, progresso, metas/períodos, conquistas, feed, recomendações |
| `sync-api.yaml` | `POST /sync/push` e `GET /sync/pull` (delta, idempotência, soft delete) |

## Rotas

```text
POST   /api/auth/magic-link/request
POST   /api/auth/magic-link/verify
POST   /api/auth/refresh
GET    /api/auth/me
POST   /api/auth/logout
POST   /api/auth/2fa/setup
POST   /api/auth/2fa/confirm
POST   /api/auth/2fa/verify
POST   /api/auth/2fa/disable
GET    /api/auth/devices
POST   /api/auth/devices
DELETE /api/auth/devices/{id}

POST   /api/spaces
GET    /api/spaces/{id}/members
PATCH  /api/spaces/{id}/members/{memberId}
DELETE /api/spaces/{id}/members/{memberId}
POST   /api/spaces/{id}/invites
POST   /api/invites/{token}/accept

GET    /api/catalog/search?q=&isbn=
GET    /api/books
POST   /api/books
GET    /api/user-books
POST   /api/user-books
PATCH  /api/user-books/{id}
GET    /api/reading-logs
POST   /api/reading-logs

GET    /api/goals
POST   /api/goals
GET    /api/goals/{id}/periods
GET    /api/goals/{id}/periods/current
POST   /api/goal-periods/{id}/reopen

GET    /api/achievements
POST   /api/achievements/{id}/card   # registra payload do card (opcional; card é client-side)
GET    /api/dashboard

GET    /api/feed
POST   /api/posts
POST   /api/posts/{id}/reactions
DELETE /api/posts/{id}/reactions
GET    /api/posts/{id}/comments
POST   /api/posts/{id}/comments

GET    /api/challenges
POST   /api/challenges

GET    /api/recommendations
POST   /api/recommendations/{id}/dismiss
POST   /api/recommendations/{id}/add

POST   /api/sync/push
GET    /api/sync/pull?since=&limit=
```
