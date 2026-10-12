# Implementation Plan: Minha Leitura — Rastreamento de Leitura com Metas e Feed do Casal

**Branch**: `001-leitura-metas` | **Date**: 2026-10-11 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-leitura-metas/spec.md`

## Summary

Entregar o MVP de um PWA offline-first para rastrear leitura: autenticação por Magic Link +
2FA TOTP step-up, **espaço** do casal com RBAC e convites, acervo pessoal (`quero ler |
lendo | lido | abandonado`) com progresso de páginas, **metas de páginas/livros por
dia/semana/mês** com dia de início configurável, compensação de dias e janela de graça de
fechamento, card de conquista compartilhável, dashboards, feed social leve (curtidas e
comentários), desafios conjuntos e recomendações a partir do acervo + catálogo externo
gratuito.

**Abordagem técnica**: PWA Vue 3 + Vite + TypeScript (strict) com Tailwind CSS e
shadcn-vue; persistência local em IndexedDB (Dexie.js) espelhando as entidades e uma fila
Outbox; backend PocketBase self-host com collections, regras de acesso e hooks JavaScript;
validação com Zod compartilhada (pacote `@ml/shared`) entre client e hooks. A sincronização
usa `POST /api/sync/push` (lote da Outbox, idempotente por `sync_id`) e
`GET /api/sync/pull?since=<cursor>` (delta via change log), incluindo soft deletes. O
servidor é o source-of-truth; conflitos resolvem por Last-Write-Wins no `updated_at` do
servidor com marcação de conflito. O cálculo de metas roda **puro em `@ml/shared`** (mesma
função no client e no backend). Cards de conquista são gerados no client (Canvas/SVG) a
partir do estado local, sem dependência de rede. Acesso em teste via Cloudflare Tunnel.

## Technical Context

**Language/Version**: TypeScript 5.4+ (`strict`), Node.js 20 LTS; PocketBase 0.23+
(JavaScript hooks no runtime Goja).

**Primary Dependencies**:
- Frontend: Vue 3.4, Vite 5, vue-router 4, Pinia 2, Tailwind CSS 3, shadcn-vue (Reka UI),
  Dexie.js 4, vite-plugin-pwa (Workbox 7), Zod 3, @vueuse/core, date-fns(-tz), otpauth,
  @simplewebauthn/browser.
- Backend: PocketBase (collections + access rules + JS hooks), Zod (bundle para hooks),
  otpauth (TOTP), crypto nativo (AES-GCM para segredo 2FA).
- Catálogo externo: Open Library (HTTP, sem chave; fallback Google Books opcional).
- Qualidade: Vitest, @vue/test-utils, fake-indexeddb, MSW, Playwright, vue-tsc, ESLint,
  Prettier.

**Storage**: cliente IndexedDB (Dexie); servidor SQLite gerenciado pelo PocketBase
(`pb_data/`), com tabela auxiliar `change_log` (AUTOINCREMENT) para delta de sync.

**Testing**: Vitest (unit + contract das regras puras e schemas), fake-indexeddb (Dexie),
Playwright (E2E incl. modo offline e PWA), e integração de backend contra instância
PocketBase efêmera (data dir temporário).

**Target Platform**: PWA instalável (Android Chrome/Edge, iOS 16.4+); backend Linux via
Docker/VPS; publicação de teste via Cloudflare quick tunnel.

**Project Type**: Web application (frontend PWA + backend PocketBase) em monorepo com
pacote compartilhado.

**Performance Goals**: feedback local de UI < 100 ms (otimista); dashboard renderiza do
cache antes de qualquer rede; `push`/`pull` de 50 itens < 2 s p95; geração do card < 2 s;
app abre e navega offline.

**Constraints**: 100% offline-capable; isolamento por `space` obrigatório; nenhuma regra de
negócio apenas no front; TypeScript strict sem `any` implícito; Zod no client e no server;
pt-BR; cálculos de meta com `CF_TIMEZONE` (default `America/Sao_Paulo`); catálogo externo
nunca bloqueia o fluxo.

**Scale/Scope**: uso pessoal/casal (2 usuários por espaço, alguns milhares de logs),
~12 telas, ~16 collections.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Gate | Status |
|-----------|------|--------|
| I. Segurança/Privacidade (NON-NEGOTIABLE) | Toda collection filtra `space`; regras de negócio e RBAC em hooks do PocketBase; Zod server-side; 2FA step-up no backend; soft delete; `audit_logs`. | PASS |
| II. Offline-First Confiável | Dexie + Outbox, `sync_id` UUID, dedup server-side, pull por delta com soft deletes, LWW com `updated_at` do servidor. | PASS |
| III. Metas Determinísticas (NON-NEGOTIABLE) | Cálculo puro em `@ml/shared` (client e hooks), fuso `CF_TIMEZONE`, semana com início configurável, graça e fechamento imutável. | PASS |
| IV. Testes de Regras (NON-NEGOTIABLE) | Suítes Vitest para metas/períodos/graça/streak, progresso, recomendações, sync/conflitos; testes de isolamento por espaço. | PASS |
| V. Simplicidade | MVP enxuto; PocketBase evita back-end custom; catálogo externo opcional e degradável. | PASS |
| VI. UX Mobile-First/a11y/pt-BR | Layout mobile-first, componentes acessíveis shadcn-vue, formatação `Intl` pt-BR, ARIA. | PASS |
| VII. Conteúdo Gerado Confiável | Card de conquista determinístico a partir do estado, gerado offline, sem vazar dados além do exibido. | PASS |
| VIII. Observabilidade/Versionamento | Logs estruturados nos hooks; `audit_logs`; indicador de sync; API versionada em `/api`. | PASS |

Nenhuma violação identificada. Sem necessidade de justificativa em Complexity Tracking.

**Re-check pós-design (Phase 1)**: PASS — as decisões de `research.md` (D1, D2, D5) e os
artefatos de `data-model.md`/`contracts/` permanecem conformes aos princípios I, II e III; a
reabertura auditada reforça o Princípio I e os limites do catálogo reforçam V/VI.

## Decisões Incorporadas (pós `/speckit.clarify`)

Regras de negócio recém-fechadas e onde foram materializadas:

- **FR-017 — Reabertura de período fechado**: restrita a `owner | partner`, com step-up e
  registro em `audit_logs`; período volta a `aberto` respeitando a graça e dispara recálculo de
  progresso/status/streak/conquistas. Ver `research.md` D2, `data-model.md` (`goal_periods`) e
  `contracts/reading-api.yaml` (`/goal-periods/{id}/reopen`).
- **FR-035 — Mudança do dia de início**: aplica-se só a partir do **próximo período**; período
  aberto e fechados mantêm as fronteiras originais (sem re-bucket de `reading_logs`). Ver
  `research.md` D1 e `data-model.md` (`goals`).
- **FR-036 — Meta de livros e abandono**: só `status = lido` conta (por `finished_at`);
  `abandonado` subtrai do período **aberto** (recalculado), fechados imutáveis. Ver
  `research.md` D2 e `data-model.md` (`goal_periods`).
- **FR-037 — Limites do catálogo externo**: persistir só metadados adotados no acervo; cache
  com TTL de 30 dias; máx. 10 resultados por consulta; capas cacheadas com teto ~100/50 MB
  (LRU); timeout/backoff e degradação offline. Ver `research.md` D5, `data-model.md`
  (`catalog_cache`, `recommendations`) e `contracts/reading-api.yaml` (`/catalog/search`).

## Project Structure

### Documentation (this feature)

```text
specs/001-leitura-metas/
├── plan.md              # Este arquivo (/speckit.plan)
├── research.md          # Fase 0 (/speckit.plan)
├── data-model.md        # Fase 1 (/speckit.plan)
├── quickstart.md        # Fase 1 (/speckit.plan)
├── contracts/           # Fase 1 (/speckit.plan)
│   ├── README.md
│   ├── auth-api.yaml
│   ├── reading-api.yaml
│   └── sync-api.yaml
├── checklists/
│   └── requirements.md
└── tasks.md             # Fase 2 (/speckit.tasks)
```

### Source Code (repository root)

```text
apps/
├── web/                              # PWA Vue 3 + Vite + TypeScript
│   ├── src/
│   │   ├── main.ts
│   │   ├── App.vue
│   │   ├── router/                   # rotas + guards (auth, 2FA, space, app lock)
│   │   ├── stores/                   # Pinia (session, space, sync, goals, feed, ui)
│   │   ├── db/                       # Dexie schema, repositórios, migrações locais
│   │   ├── sync/                     # outbox, pusher, puller, conflict resolver, cursors
│   │   ├── api/                      # http client, auth-api, reading-api, sync-api, catalog
│   │   ├── features/                 # auth, space, library, progress, goals, dashboard,
│   │   │                             #   achievements(card), feed, challenges, recommend
│   │   ├── components/ui/            # componentes shadcn-vue
│   │   ├── composables/              # useOnline, useAppLock, useSync, useGoalPeriod
│   │   ├── lib/                      # dates/tz, share (download/navigator.share), canvas
│   │   └── assets/
│   ├── public/
│   ├── tests/
│   │   ├── unit/                     # Vitest (regras puras, stores, dexie)
│   │   ├── contract/                 # schemas vs respostas da API
│   │   └── e2e/                      # Playwright (offline, sync, metas, feed)
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   └── package.json
└── pocketbase/
    ├── pb_migrations/                # collections, índices, change_log, seed
    ├── pb_hooks/
    │   ├── main.pb.js                # bootstrap de rotas (routerAdd) + SMTP via CF_MAIL_*
    │   ├── routes/                   # auth.pb.js, space.pb.js, reading.pb.js,
    │   │                             #   goals.pb.js, feed.pb.js, sync.pb.js
    │   └── lib/                      # domain rules, validation, audit, totp, magic-link,
    │                                 #   crypto, ratelimit, shared.js (bundle @ml/shared)
    ├── Dockerfile
    ├── pocketbase                    # binário (não versionado)
    └── pb_data/                      # dados locais (gitignored)

packages/
└── shared/                           # @ml/shared
    ├── src/
    │   ├── entities/                 # schemas Zod por entidade
    │   ├── api/                      # schemas de request/response + erros
    │   ├── domain/                   # regras puras: period (dia/semana/mês, iniício),
    │   │                             #   goal (progresso/batida), progress, streak,
    │   │                             #   recommend, conflict (LWW), dates/tz
    │   └── constants/                # enums, papéis, status, fontes de catálogo
    ├── scripts/bundle-for-hooks.mjs  # esbuild -> pocketbase/pb_hooks/lib/shared.js
    └── package.json

docker/
├── Dockerfile.pocketbase
├── docker-compose.yml                # dev: pocketbase + volume pb_data
├── docker-compose.tunnel.yml         # teste: caddy + cloudflared + web + pocketbase
├── Caddyfile.tunnel
└── .env.tunnel.example
scripts/
└── tunnel-up.sh                      # publica via Cloudflare quick tunnel
specs/
```

**Structure Decision**: Monorepo com dois apps (`apps/web` PWA e `apps/pocketbase`) e um
pacote de contrato `packages/shared` (`@ml/shared`). O pacote compartilhado é a única fonte
dos schemas Zod e das **regras puras de período/meta/progresso**, garantindo contrato único
entre cliente e hooks do PocketBase (empacotado para JS em `pb_hooks/lib/shared.js`). Essa
separação atende aos princípios III e IV sem duplicar cálculo nem validação.

## Testing Strategy

Hierarquia de testes e comandos (executados via pnpm na raiz do monorepo):

1. **Regras puras de domínio (unit, obrigatório)** — `pnpm test:shared`
   - Períodos: recorte dia/semana/mês, semana com início configurável, virada de mês.
   - Metas: agregação acumulada, compensação de dias, `batida | não batida`, graça de 24 h,
     fechamento imutável, streak.
   - Progresso: página atual, restante, %, transição de status.
   - Recomendações: geração determinística e deduplicação de lidos/abandonados.
   - Conflito: LWW por `updated_at`, empate → servidor.
2. **Dexie/Offline (unit + integração local)** — `pnpm test:web`
   - Repositórios e transações; Outbox FIFO; retry; fake-indexeddb; optimistic UI stores.
3. **Contrato (contract)** — `pnpm test:contract`
   - Respostas de `push`/`pull`/auth/reading validadas contra os schemas Zod de `@ml/shared`.
4. **Backend/integração (integração)** — `pnpm test:pb`
   - PocketBase efêmero (data dir temporário) com migrações; testa isolamento por `space`,
     RBAC, idempotência de `sync_id`, soft delete, auditoria, rate limit.
5. **E2E (Playwright)** — `pnpm test:e2e`
   - Fluxo de auth/2FA, cadastro de livro + progresso offline + reconexão, fechamento de
     meta (batida e não batida), geração de card, feed/curtida/comentário, dashboard, PWA.

Portões (ver `quickstart.md`): lint + `vue-tsc --noEmit` sem erros; todas as suítes de
regras de negócio verdes; nenhum `any` implícito; nenhuma regra de negócio validada apenas
no client.

## Threat Model & Trust Boundaries

- **Fronteiras de confiança**: navegador/PWA (não confiável) ↔ API PocketBase (confiável);
  IndexedDB local não criptografado ↔ memória da aplicação.
- **Superfícies de ataque**: Magic Link/2FA, convites, sync push/pull, catálogo externo
  (dados de terceiros), rotas anônimas.

| Ameaça | Mitigação | Princípio |
|--------|-----------|-----------|
| Cross-space (IDOR) | `space` derivado da sessão + regras/hooks no backend | I |
| Roubo/reuso de Magic Link | token CSPRNG de uso único + expiração curta | I |
| Força bruta 2FA | rate limit + bloqueio + revogação + notificação | I |
| Vazamento de segredos | AES-GCM + campos ocultos + logs sem segredos | I |
| Cliente malicioso | Zod server-side + regras no backend (nunca confiar no front) | I/III |
| Duplicação/replay de sync | idempotência por `sync_id` + dedup | II |
| Meta "inflada" por bugs de fuso/DST | cálculo puro e testado com `CF_TIMEZONE` | III |
| Catálogo externo malicioso/instável | timeout, validação Zod, fallback para acervo interno | V/VI |
| XSS/CSRF/CORS | CSP restritivo, CORS allowlist, cookies HttpOnly/Secure | I |

## Complexity Tracking

> Sem violações de Constitution Check. Nenhuma entrada necessária.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| — | — | — |
