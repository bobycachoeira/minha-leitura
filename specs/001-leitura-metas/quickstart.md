# Quickstart — Minha Leitura

**Objetivo**: subir o app localmente, publicar em teste via Cloudflare Tunnel e validar o
caminho crítico (login → acervo → progresso → meta → card).

## Pré-requisitos

- Node.js 20 LTS + pnpm 9+
- Binário do PocketBase 0.23+ em `apps/pocketbase/pocketbase` (não versionado)
- Docker + Docker Compose (para o túnel de teste)
- Chromium para E2E (Playwright)

## Setup

```bash
pnpm install
pnpm build:hooks                          # gera apps/pocketbase/pb_hooks/lib/shared.js

cp apps/pocketbase/.env.example apps/pocketbase/.env
cp apps/web/.env.example apps/web/.env.local
```

Variáveis principais do backend: `CF_ENCRYPTION_KEY`, `CF_MAIL_*`, `CF_CORS_ORIGINS`,
`CF_STEPUP_TTL`, `CF_TIMEZONE`, `CF_APP_URL`. Do frontend: `VITE_API_URL`.

## Executando (dev)

```bash
# Backend (PocketBase com migrações)
cd apps/pocketbase && ./pocketbase serve --http=127.0.0.1:8090

# Frontend
pnpm --filter @ml/web dev                 # http://localhost:5173
```

Sem SMTP configurado, o Magic Link aparece no log do PocketBase (modo dev).

## Publicar em teste (Cloudflare Tunnel)

Reaproveita o padrão do `controle-financeiro`:

```bash
cp docker/.env.tunnel.example docker/.env.tunnel   # ajuste CF_ADMIN_EMAIL e CF_ENCRYPTION_KEY
./scripts/tunnel-up.sh
```

O script sobe Caddy + web + PocketBase + cloudflared e imprime a URL
`https://<aleatorio>.trycloudflare.com`. Roteamento: `/api/*` e `/_/*` → PocketBase; demais
→ PWA. Parar com `docker compose -f docker/docker-compose.tunnel.yml down`.

## Validação do caminho crítico (MVP)

1. **Login**: solicitar Magic Link, autenticar, ativar 2FA, marcar dispositivo confiável.
2. **Espaço**: criar espaço, convidar a esposa (papel `partner`) e aceitar o convite.
3. **Acervo**: cadastrar um livro (busca por ISBN ou manual) e movê-lo para `lendo`; conferir a **estante em grid com capas**, o placeholder de um livro sem capa e as capas em cache offline.
4. **Progresso**: registrar 120 páginas em 2 dias; conferir página atual e % (offline).
5. **Meta**: criar meta `semana`, `paginas`, alvo 140, `week_start=1`, `grace_hours=24`.
   - Registrar as 20 páginas restantes no último dia (ou dentro da graça) → período `batida`.
   - Deixar outro período sem bater → `nao_batida` após a graça.
6. **Card**: gerar o card de conquista e compartilhar (validar números vs. período).
7. **Dashboard**: conferir progresso, restantes, dias restantes e streak.
8. **Feed**: concluir um livro e ver o evento no feed; curtir e comentar como o outro membro.
9. **Offline/sync**: repetir 4–6 com a rede desligada, reconectar e conferir que nada
   duplicou nem sumiu.

## Validação das regras refinadas (pós-clarify)

10. **Reabertura de período (FR-017)**: fechar um período como `nao_batida`; reabrir como
    membro `owner`/`partner` (dispara step-up) e conferir `reopened_at`, a entrada em
    `audit_logs` e o recálculo de progresso/status/streak/conquista; confirmar que `viewer`
    não consegue reabrir.
11. **Mudança do dia de início (FR-035)**: com uma semana aberta (`week_start=1`), alterar para
    `week_start=0` e confirmar que o período atual fecha com as fronteiras antigas e que o
    **próximo** período passa a usar segunda-feira→domingo (sem mover lançamentos antigos).
12. **Meta de livros e abandono (FR-036)**: com meta `livros` aberta, concluir um livro
    (progresso +1) e depois marcá-lo `abandonado` → o progresso do período aberto volta; um
    período já fechado não muda.
13. **Limites do catálogo externo (FR-037)**: `/catalog/search` retorna ≤ 10 resultados; cache
    expira em 30 dias; ao exceder ~100 capas/50 MB o descarte é LRU; offline/falha cai no
    placeholder sem bloquear a estante nem as recomendações internas.

## Testes e portões

| Comando | Escopo |
|---------|--------|
| `pnpm lint` | ESLint |
| `pnpm typecheck` | `vue-tsc --noEmit` + `tsc` (TS strict) |
| `pnpm test:shared` | Regras puras: período, meta/graça, progresso, streak, recomendação, conflito |
| `pnpm test:web` | Dexie/Outbox/stores (fake-indexeddb) |
| `pnpm test:contract` | Schemas push/pull/auth/reading |
| `pnpm test:pb` | Integração PocketBase efêmero: isolamento, RBAC, sync, metas |
| `pnpm test:e2e` | Playwright (requer o app rodando) |

**Portões de conclusão**: lint + typecheck sem erros; suítes de regras de negócio verdes;
nenhum `any` implícito; nenhuma regra de negócio validada apenas no client; isolamento por
`space` comprovado em teste.
