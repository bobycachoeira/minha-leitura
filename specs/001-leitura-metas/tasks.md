---
description: "Task list for Minha Leitura — rastreamento de leitura com metas e feed do casal"
---

# Tasks: Minha Leitura

**Input**: Design documents from `/specs/001-leitura-metas/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Incluídos como obrigatórios — a constituição exige testes automatizados das
regras de negócio (períodos/metas/graça/streak, progresso, recomendações, sync/conflitos) e
testes de isolamento por `space`.

**Organization**: Tarefas agrupadas por user story para implementação e teste independentes.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Pode rodar em paralelo (arquivos diferentes, sem dependências pendentes)
- **[Story]**: US1..US8 conforme `spec.md`
- Convenção de paths: monorepo `apps/web/`, `apps/pocketbase/`, `packages/shared/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Inicialização do monorepo e ferramental

- [x] T001 Criar a estrutura do monorepo (`apps/web`, `apps/pocketbase`, `packages/shared`, `docker/`, `scripts/`) conforme `plan.md`
- [x] T002 Configurar workspace pnpm em `pnpm-workspace.yaml` + `package.json` raiz (scripts `lint`, `typecheck`, `test:shared`, `test:web`, `test:contract`, `test:pb`, `test:e2e`, `build:hooks`) + `tsconfig.base.json` (TypeScript `strict`, sem `any` implícito)
- [x] T003 [P] Inicializar o app PWA em `apps/web` (Vue 3 + Vite + TS) com `index.html`, `vite.config.ts`, `tsconfig.json`
- [x] T004 [P] Inicializar o pacote `@ml/shared` em `packages/shared` com `tsconfig.json` e `package.json`
- [x] T005 [P] Configurar Tailwind CSS e shadcn-vue em `apps/web/tailwind.config.ts` e `apps/web/src/components/ui/`
- [x] T006 [P] Configurar ESLint + Prettier na raiz (`.eslintrc.cjs`, `.prettierrc`) com regras de imports e proibição de `any` implícito
- [x] T007 [P] Configurar Vitest em `packages/shared/vitest.config.ts` e `apps/web/vitest.config.ts`
- [x] T008 [P] Configurar Playwright em `apps/web/playwright.config.ts`
- [x] T009 Configurar PWA (Workbox, update prompt controlado) em `apps/web/vite.config.ts`
- [x] T010 [P] Criar `docker/Dockerfile.pocketbase` e `docker/docker-compose.yml` com volume `pb_data`
- [x] T011 [P] Criar `.env.example` em `apps/pocketbase/.env.example` e `apps/web/.env.example` (`CF_ENCRYPTION_KEY`, `CF_MAIL_*`, `CF_CORS_ORIGINS`, `CF_STEPUP_TTL`, `CF_TIMEZONE`, `VITE_API_URL`)
- [x] T012 [P] Criar workflow de CI (lint, typecheck, testes) em `.github/workflows/ci.yml`
- [x] T013 Criar `README.md` raiz com pré-requisitos e comandos do monorepo
- [x] T014 [P] Criar `COMANDOS.md` com o fluxo SDD (`constitution → specify → plan → tasks → implement → converge`)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Contrato compartilhado, base do PocketBase, motor de sync genérico, camada Dexie e shell de UI. **Bloqueia todas as user stories.**

**⚠️ CRITICAL**: Nenhuma user story pode começar antes desta fase.

### Contrato compartilhado (`packages/shared`)

- [x] T015 Definir enums/constantes de domínio (papéis `owner|partner|viewer`, status de leitura `quero_ler|lendo|lido|abandonado`, métrica `paginas|livros`, período `dia|semana|mes`, status de período `aberto|batida|nao_batida`, tipos de post/reaction, fontes de catálogo) em `packages/shared/src/constants/`
- [x] T016 [P] Implementar utilitários de data/fuso (`CF_TIMEZONE`) e normalização `YYYY-MM-DD` em `packages/shared/src/domain/dates.ts`
- [x] T017 [P] Implementar `resolvePeriod(goal, reference, tz)` (dia/semana com `week_start`/mês, `graceUntil`) em `packages/shared/src/domain/period.ts` (ver research D1)
- [x] T018 [P] Implementar cálculo de progresso de período (soma de `reading_logs`/livros, `remaining`, `daysRemaining`, `batida|nao_batida`) em `packages/shared/src/domain/goal.ts` (ver research D2)
- [x] T019 [P] Implementar resolução de conflito LWW (`updated_at` do servidor; empate → servidor; `conflict=true`) em `packages/shared/src/domain/conflict.ts`
- [x] T020 [P] Implementar `computeProgress(userBook, logs)` (página atual, restante, %, transição de status) em `packages/shared/src/domain/progress.ts`
- [x] T021 [P] Implementar `computeStreak(goalPeriods)` em `packages/shared/src/domain/streak.ts`
- [x] T022 Criar schema base de entidade sincronizável (`id`, `space`, `sync_id`, `updated_by`, `deleted_at`, `created`, `updated`) e schema de erro em `packages/shared/src/api/base.ts`
- [x] T023 [P] Schemas de identidade em `packages/shared/src/entities/identity.ts` (spaces, space_members, invites)
- [x] T024 [P] Schemas de acervo em `packages/shared/src/entities/library.ts` (books, user_books, reading_logs)
- [x] T025 [P] Schemas de metas/conquistas em `packages/shared/src/entities/goals.ts` (goals, goal_periods, achievements)
- [x] T026 [P] Schemas sociais em `packages/shared/src/entities/social.ts` (posts, reactions, comments, challenges, recommendations)
- [x] T027 Criar schemas de `POST /sync/push` e `GET /sync/pull` (`Operation`, `OperationResult`, `PullChange`) em `packages/shared/src/api/sync.ts` conforme `contracts/sync-api.yaml`
- [x] T028 Criar schemas dos recursos de reading/goals/feed (`BookInput`, `ReadingLogInput`, `GoalInput`, `GoalPeriod`, `Post`, `Comment`, etc.) em `packages/shared/src/api/reading.ts` conforme `contracts/reading-api.yaml`
- [x] T029 Criar script `packages/shared/scripts/bundle-for-hooks.mjs` (esbuild → `apps/pocketbase/pb_hooks/lib/shared.js`)

### Backend PocketBase

- [x] T030 Criar migração dos campos custom de `users` (name, avatar, active, twofa_*, recovery_codes_hashed, webauthn_credentials, last_known_device, last_login_at) em `apps/pocketbase/pb_migrations/`
- [x] T031 [P] Criar migração das collections `spaces`, `space_members` (índice único `(space,user)`), `invites` em `apps/pocketbase/pb_migrations/`
- [x] T032 [P] Criar migração das collections `books` (índice único `(space,source,external_id)`), `user_books` (índice único `(owner,book)`), `reading_logs` em `apps/pocketbase/pb_migrations/`
- [x] T033 [P] Criar migração das collections `goals`, `goal_periods` (índice único `(goal,start_date,end_date)`), `achievements` (índice único `(goal_period)`) em `apps/pocketbase/pb_migrations/`
- [x] T034 [P] Criar migração das collections `posts`, `reactions` (índice único `(post,user,kind)`), `comments`, `challenges`, `challenges_participants` (índice único `(challenge,user)`), `recommendations`, `notification_preferences` em `apps/pocketbase/pb_migrations/`
- [x] T035 [P] Criar migração de `sync_events` (índice único `(space,entity,sync_id)`), `audit_logs` e da tabela SQLite `change_log(seq INTEGER PRIMARY KEY AUTOINCREMENT, ...)` em `apps/pocketbase/pb_migrations/`
- [x] T036 Aplicar regras de acesso por collection (isolamento `space` + RBAC `owner|partner|viewer`) em `apps/pocketbase/pb_migrations/`
- [x] T037 Criar bootstrap de rotas em `apps/pocketbase/pb_hooks/main.pb.js` (routerAdd + SMTP via `CF_MAIL_*`) e carregamento de `shared.js`
- [x] T038 Implementar helpers de auth/middleware (`session`, `space`, `requireRole`, `requireStepUp`) em `apps/pocketbase/pb_hooks/lib/auth.js`
- [x] T039 [P] Implementar lib de auditoria (write em `audit_logs` sem dados sensíveis) em `apps/pocketbase/pb_hooks/lib/audit.js`
- [x] T040 [P] Implementar lib de rate limiting (magic-link 5/15min, 2FA 5/10min, convite 10/dia, sync 60/min) em `apps/pocketbase/pb_hooks/lib/ratelimit.js`
- [x] T041 [P] Implementar lib de criptografia AES-GCM do segredo 2FA em `apps/pocketbase/pb_hooks/lib/crypto.js`
- [x] T042 [P] Implementar writer de `change_log` em `apps/pocketbase/pb_hooks/lib/changelog.js`
- [x] T043 Implementar `POST /api/sync/push` (aplicação genérica, idempotência por `sync_id`, validação Zod, conflito LWW, tombstone vence) em `apps/pocketbase/pb_hooks/routes/sync.pb.js`
- [x] T044 Implementar `GET /api/sync/pull?since=&limit=` (delta via `change_log`, inclui soft deletes) em `apps/pocketbase/pb_hooks/routes/sync.pb.js`
- [x] T045 Implementar envelope de erro e logger estruturado em `apps/pocketbase/pb_hooks/lib/http.js`

### Base do cliente (`apps/web`)

- [x] T046 [P] Definir schema Dexie e migrações locais (espelho das collections + `outbox` e `meta`) em `apps/web/src/db/schema.ts`
- [x] T047 Implementar repositórios Dexie (CRUD local + enqueue na Outbox + escrita otimista) em `apps/web/src/db/repositories.ts`
- [x] T048 Implementar HTTP client (Bearer, refresh, header `X-Step-Up-Token`, envelope de erro) em `apps/web/src/api/client.ts`
- [x] T049 Implementar store de sessão/auth (tokens, step-up, logout) em `apps/web/src/stores/session.ts`
- [x] T050 Implementar router e guards (auth → 2FA → espaço) em `apps/web/src/router/index.ts`
- [x] T051 Implementar shell de UI mobile-first acessível (layout, tema, toasts, foco, ARIA) em `apps/web/src/App.vue` e `apps/web/src/components/ui/`
- [x] T052 [P] Implementar composable `useOnline` e store de sync (estado, cursor, pendências) em `apps/web/src/composables/useOnline.ts` e `apps/web/src/stores/sync.ts`
- [x] T053 Implementar helpers de formatação pt-BR (Intl: datas, números) em `apps/web/src/lib/format.ts`

### Testes de fundação

- [x] T054 [P] Testes unitários de período (dia/semana com `week_start`/mês, virada de mês) em `packages/shared/tests/period.test.ts`
- [x] T055 [P] Testes unitários de meta/graça (compensação, `batida`, `nao_batida`, graça 24 h) em `packages/shared/tests/goal.test.ts`
- [x] T056 [P] Testes unitários de streak, progresso e conflito LWW em `packages/shared/tests/streak-progress-conflict.test.ts`
- [x] T057 [P] Testes de contrato dos schemas push/pull/reading em `apps/web/tests/contract/sync-reading-schema.test.ts`
- [x] T058 Criar harness de PocketBase efêmero (data dir temporário + migrações) e smoke test de isolamento em `apps/pocketbase/tests/harness.ts` e `apps/pocketbase/tests/isolation.test.ts`

**Checkpoint**: Fundação pronta — user stories podem começar.

---

## Phase 3: User Story 1 - Acesso seguro e espaço do casal (Priority: P1) 🎯 MVP

**Goal**: Login por Magic Link, 2FA TOTP step-up, dispositivos confiáveis e espaço do casal com convite/RBAC.

**Independent Test**: Solicitar link, autenticar, ativar 2FA, criar espaço, convidar `partner`, aceitar; ação sensível exige step-up; acesso cross-space negado.

### Tests for User Story 1 ⚠️

- [x] T059 [P] [US1] Teste de contrato das rotas de auth/space/convite em `apps/web/tests/contract/auth-api.test.ts`
- [x] T060 [P] [US1] Teste de integração: Magic Link uso único/expiração, step-up, revogação de dispositivo e isolamento por `space` em `apps/pocketbase/tests/auth-space.test.ts`

### Implementation for User Story 1

- [x] T061 [P] [US1] Implementar lib de Magic Link (token CSPRNG, hash, expiração 10–15 min, uso único) em `apps/pocketbase/pb_hooks/lib/magic-link.js`
- [x] T062 [P] [US1] Implementar envio de e-mail (SMTP/API) em `apps/pocketbase/pb_hooks/lib/mailer.js`
- [x] T063 [P] [US1] Implementar TOTP (setup/confirm/verify, segredo AES-GCM, recovery codes) em `apps/pocketbase/pb_hooks/lib/totp.js` e `apps/pocketbase/pb_hooks/lib/stepup.js`
- [x] T064 [US1] Implementar rotas de auth (`/auth/magic-link/request|verify`, `/auth/refresh`, `/auth/me`, `/auth/logout`, `/auth/2fa/*`) em `apps/pocketbase/pb_hooks/routes/auth.pb.js`
- [x] T065 [P] [US1] Implementar dispositivos confiáveis (list/create/remove) em `apps/pocketbase/pb_hooks/routes/devices.pb.js`
- [x] T066 [US1] Implementar criação de espaço, convites (token de uso único) e aceite com RBAC em `apps/pocketbase/pb_hooks/routes/space.pb.js`
- [x] T067 [P] [US1] Implementar tela de login (Magic Link) em `apps/web/src/features/auth/LoginView.vue`
- [x] T068 [P] [US1] Implementar tela de 2FA/step-up e gestão de dispositivos em `apps/web/src/features/auth/TwoFactorView.vue`
- [x] T069 [US1] Implementar onboarding de espaço + convite em `apps/web/src/features/space/OnboardingView.vue` e `apps/web/src/api/space-api.ts`
- [x] T070 [US1] Integrar guards de rota e tratamento de sessão expirada (401 → login) em `apps/web/src/router/index.ts`

**Checkpoint**: US1 funcional e testável isoladamente.

---

## Phase 4: User Story 2 - Acervo e progresso de leitura (Priority: P1)

**Goal**: Cadastrar livros (busca/manual), organizar por status, registrar páginas e acompanhar progresso.

**Independent Test**: Cadastrar livro, mover status, registrar páginas em dias diferentes e conferir página atual/% (inclusive offline).

### Tests for User Story 2 ⚠️

- [x] T071 [P] [US2] Testes unitários de `computeProgress` (limite total, transição para `lido`, % ) em `packages/shared/tests/progress.test.ts`
- [x] T071a [P] [US2] Teste unitário dos limites do catálogo externo (máx. 10 resultados, TTL 30 dias, descarte LRU de capas, degradação offline) em `apps/web/tests/unit/catalog-limits.test.ts` (FR-037)
- [x] T072 [P] [US2] Teste de integração de books/user_books/reading_logs (isolamento por `space`, soft delete, recálculo de progresso) em `apps/pocketbase/tests/library.test.ts`

### Implementation for User Story 2

- [x] T073 [P] [US2] Implementar client do catálogo externo gratuito (Open Library: busca/ISBN, limite de **10 resultados por consulta**, timeout 3 s + backoff, validação Zod, cache Dexie com **TTL de 30 dias**, fallback) em `apps/web/src/api/catalog.ts` (FR-037)
- [x] T074 [US2] Implementar endpoints de `books` (list/create + busca de catálogo) em `apps/pocketbase/pb_hooks/routes/reading.pb.js`
- [x] T075 [US2] Implementar endpoints de `user-books` (list/create/patch com validação) em `apps/pocketbase/pb_hooks/routes/reading.pb.js`
- [x] T076 [US2] Implementar endpoints de `reading-logs` (list/create; dispara recálculo de progresso e metas) em `apps/pocketbase/pb_hooks/routes/reading.pb.js`
- [x] T077 [US2] Implementar store de acervo/progresso (Pinia + Dexie otimista) em `apps/web/src/stores/library.ts`
- [x] T078 [P] [US2] Implementar tela de estante em **grid visual com capas** + filtros por status e busca por título/autor em `apps/web/src/features/library/LibraryView.vue` (FR-032)
- [x] T079 [P] [US2] Implementar formulário de livro (busca por ISBN/título + manual, com prévia da capa) em `apps/web/src/features/library/BookForm.vue`
- [x] T080 [P] [US2] Implementar detalhe do livro + registro de páginas em `apps/web/src/features/library/BookDetailView.vue`
- [x] T081 [US2] Implementar avaliação, notas, tags e favorito em `apps/web/src/features/library/BookReview.vue`
- [x] T081a [P] [US2] Implementar componente `BookCover` com placeholder determinístico (iniciais + cor) e fallback em erro/`onerror` em `apps/web/src/features/library/BookCover.vue` (FR-033)
- [x] T081b [US2] Implementar cache local de capas em Dexie (`cover_cache` por `book.id`) com **teto de ~100 capas / 50 MB e descarte LRU**, carregamento offline com fallback em `apps/web/src/db/cover-cache.ts` (FR-034, FR-037)
- [x] T081c [P] [US2] Teste unitário do placeholder de capa (determinismo) e do fallback de cache no client em `apps/web/tests/unit/book-cover.test.ts`

**Checkpoint**: US1 e US2 funcionais; registrar páginas alimenta o motor de metas.

---

## Phase 5: User Story 3 - Metas com compensação, graça e fechamento (Priority: P1)

**Goal**: Metas de páginas/livros por dia/semana/mês, dia de início configurável, fechamento com graça.

**Independent Test**: Meta semanal 140 (seg→dom); 120 páginas em 3 dias + 20 no último dia (ou na graça) → `batida`; outro período → `nao_batida`.

### Tests for User Story 3 ⚠️

- [x] T082 [P] [US3] Testes unitários avançados de meta (compensação, semana cruzando meses, DST, **mudança do dia de início com efeito só no próximo período**) em `packages/shared/tests/goal-periods.test.ts` (FR-035)
- [x] T083 [P] [US3] Teste de integração de metas (fechamento por cron/trigger, imutabilidade, reabertura auditada por `owner|partner` com step-up e recálculo de streak/conquistas) em `apps/pocketbase/tests/goals.test.ts` (FR-017)

### Implementation for User Story 3

- [x] T084 [US3] Implementar endpoints de `goals` (list/create; valida `week_start`, `grace_hours`) em `apps/pocketbase/pb_hooks/routes/goals.pb.js`
- [x] T085 [US3] Implementar endpoints de `goal-periods` (list, current; derivação/recomputo por `reading_logs`) em `apps/pocketbase/pb_hooks/routes/goals.pb.js`
- [x] T085a [US3] Implementar a **vigência do dia de início** (nova regra de `week_start` só a partir do próximo período; período aberto/fechados mantêm fronteiras originais) em `packages/shared/src/domain/period.ts` e `apps/pocketbase/pb_hooks/routes/goals.pb.js` (FR-035)
- [x] T086 [US3] Implementar tarefa de fechamento de períodos (`cronAdd`) + reabertura auditada (`POST /goal-periods/{id}/reopen`) restrita a `owner|partner` com step-up, gravando `reopened_at` + `audit_logs` (before/after), voltando o período a `aberto` e recalculando progresso/status/streak/conquistas em `apps/pocketbase/pb_hooks/routes/goals.pb.js` (FR-017)
- [x] T087 [US3] Implementar store de metas e seletores (período corrente, restantes, dias) em `apps/web/src/stores/goals.ts`
- [x] T088 [P] [US3] Implementar formulário de meta (métrica, período, alvo, dia de início, graça) em `apps/web/src/features/goals/GoalForm.vue`
- [x] T089 [P] [US3] Implementar tela de progresso da meta (barra, restantes, contagem regressiva, graça) em `apps/web/src/features/goals/GoalProgress.vue`
- [x] T090 [US3] Integrar recálculo de metas às mutações de `reading_logs` (create/update/delete) no client e nos hooks

**Checkpoint**: US1–US3 formam o MVP de valor.

---

## Phase 6: User Story 4 - Conquista compartilhável (Priority: P2)

**Goal**: Card determinístico de `batida`/`nao_batida`, gerado offline e compartilhável.

**Independent Test**: Bater a meta, gerar o card, compartilhar a imagem e conferir os números.

### Tests for User Story 4 ⚠️

- [x] T091 [P] [US4] Teste unitário de `buildAchievementPayload` (determinismo; online vs offline) em `packages/shared/tests/achievement.test.ts`

### Implementation for User Story 4

- [x] T092 [P] [US4] Implementar `buildAchievementPayload(goalPeriod, logs, books, streak)` em `packages/shared/src/domain/achievement.ts`
- [x] T093 [US4] Implementar endpoint de `achievements` (list; índice único por período) em `apps/pocketbase/pb_hooks/routes/goals.pb.js`
- [x] T094 [US4] Implementar composable `useAchievementCard` (Canvas, temas, determinístico, offline) em `apps/web/src/features/achievements/useAchievementCard.ts`
- [x] T095 [US4] Implementar exportação/`navigator.share`/download do card em `apps/web/src/lib/share.ts`
- [x] T096 [US4] Implementar tela de conquista (preview + compartilhar + tema) em `apps/web/src/features/achievements/AchievementView.vue`

**Checkpoint**: US4 agrega o elemento celebratório sem depender de rede.

---

## Phase 7: User Story 5 - Dashboards e status da meta (Priority: P2)

**Goal**: Painéis com status das metas, páginas por período e streak.

**Independent Test**: Abrir dashboard e conferir que os números batem com os lançamentos.

### Tests for User Story 5 ⚠️

- [x] T097 [P] [US5] Teste de integração de `/dashboard` (agregações por período/streak) em `apps/pocketbase/tests/dashboard.test.ts`

### Implementation for User Story 5

- [x] T098 [US5] Implementar endpoint `GET /api/dashboard` (metas ativas, progresso, streak, páginas por dia) em `apps/pocketbase/pb_hooks/routes/reading.pb.js`
- [x] T099 [P] [US5] Implementar gráfico de páginas por dia em `apps/web/src/features/dashboard/PagesChart.vue`
- [x] T100 [US5] Implementar tela de dashboard (metas ativas, restantes, dias, streak) em `apps/web/src/features/dashboard/DashboardView.vue`
- [x] T101 [US5] Integrar dashboard como rota inicial após login em `apps/web/src/router/index.ts`

**Checkpoint**: US5 dá visibilidade e informa o que compensar.

---

## Phase 8: User Story 6 - Feed social e interação do casal (Priority: P2)

**Goal**: Feed de atividades do espaço com curtidas e comentários; ver metas/progresso um do outro.

**Independent Test**: Concluir livro, ver no feed, curtir e comentar; interação persiste.

### Tests for User Story 6 ⚠️

- [x] T102 [P] [US6] Teste unitário de `deriveFeedEvents` (livro concluído, meta batida, deduplicação) em `packages/shared/tests/feed-events.test.ts`
- [x] T103 [P] [US6] Teste de integração do feed (posts/reactions/comments, isolamento por `space`) em `apps/pocketbase/tests/feed.test.ts`

### Implementation for User Story 6

- [x] T104 [P] [US6] Implementar `deriveFeedEvents(facts)` determinístico em `packages/shared/src/domain/feed.ts`
- [x] T105 [US6] Implementar endpoints `GET /feed`, `POST /posts`, reactions (create/delete) e comments (list/create) em `apps/pocketbase/pb_hooks/routes/feed.pb.js`
- [x] T106 [US6] Materializar `posts` a partir de fatos (livro concluído, meta fechada) nos hooks de reading/goals (com dedup por `sync_id`)
- [x] T107 [US6] Implementar store e API do feed em `apps/web/src/stores/feed.ts` e `apps/web/src/api/feed-api.ts`
- [x] T108 [P] [US6] Implementar tela de feed com curtir/comentar em `apps/web/src/features/feed/FeedView.vue`
- [x] T109 [US6] Implementar visualização do progresso/metas do outro membro em `apps/web/src/features/feed/PartnerProgress.vue`

**Checkpoint**: US6 entrega o aspecto social leve.

---

## Phase 9: User Story 7 - Recomendações (Priority: P3)

**Goal**: Sugestões a partir do acervo/gostos + catálogo externo gratuito.

**Independent Test**: Com livros avaliados, ver recomendações coerentes, com motivo, sem repetir lidos/abandonados.

### Tests for User Story 7 ⚠️

- [x] T110 [P] [US7] Teste unitário de `recommend` (determinismo, exclusão de lidos/abandonados, motivo) em `packages/shared/tests/recommend.test.ts`

### Implementation for User Story 7

- [x] T111 [P] [US7] Implementar `buildTasteProfile` e `recommend` em `packages/shared/src/domain/recommend.ts` (ver research D6)
- [x] T112 [US7] Implementar endpoints de `recommendations` (list/dismiss/add) em `apps/pocketbase/pb_hooks/routes/reading.pb.js`
- [x] T113 [US7] Implementar store/API de recomendações com fallback interno em `apps/web/src/stores/recommendations.ts`
- [x] T113a [US7] Persistir recomendações no cache efêmero com `expires_at` de **30 dias** e **máx. 10 por consulta**, com degradação para o acervo interno em `apps/pocketbase/pb_hooks/routes/reading.pb.js` (FR-037)
- [x] T114 [P] [US7] Implementar tela de recomendações (motivo + um toque para `quero_ler`) em `apps/web/src/features/recommend/RecommendationsView.vue`

**Checkpoint**: US7 agrega descoberta sem bloquear por rede.

---

## Phase 10: User Story 8 - Metas de livros e desafios conjuntos (Priority: P3)

**Goal**: Metas por quantidade de livros e desafios somados do casal.

**Independent Test**: Meta mensal de 2 livros + desafio conjunto; concluir um livro avança ambos.

### Tests for User Story 8 ⚠️

- [x] T115 [P] [US8] Testes unitários de meta `livros` (só `lido` conta; `abandonado` subtrai do período aberto) e progresso de desafio somado em `packages/shared/tests/books-challenges.test.ts` (FR-036)
- [x] T116 [P] [US8] Teste de integração de challenges (soma por espaço, fechamento/graça) em `apps/pocketbase/tests/challenges.test.ts`

### Implementation for User Story 8

- [x] T117 [US8] Implementar endpoints de `challenges` (list/create; guard `owner|partner`) em `apps/pocketbase/pb_hooks/routes/feed.pb.js`
- [x] T118 [US8] Implementar progresso somado do desafio e fechamento por graça em `apps/pocketbase/pb_hooks/routes/feed.pb.js`
- [x] T119 [US8] Integrar métrica `livros` no motor de metas (client e hooks) em `packages/shared/src/domain/goal.ts`
- [x] T119a [US8] Implementar a regra de **abandono** na meta de livros: apenas `status = lido` (por `finished_at`) conta; virar `abandonado` remove o item do progresso do período **aberto** (recalculado), sem alterar períodos fechados, em `packages/shared/src/domain/goal.ts` e `apps/pocketbase/pb_hooks/routes/reading.pb.js` (FR-036)
- [x] T120 [P] [US8] Implementar tela de desafios conjuntos em `apps/web/src/features/challenges/ChallengesView.vue`

**Checkpoint**: Todas as user stories independentemente funcionais.

---

## Phase 11: Polish & Cross-Cutting Concerns

- [x] T121 [P] Implementar notificações Web Push (VAPID) opt-in e preferências em `apps/notifier/` e `apps/web/src/composables/usePush.ts`
- [x] T122 [P] Adicionar indicador de estado de sync e sincronização manual em `apps/web/src/components/SyncBadge.vue`
- [x] T123 [P] Reaproveitar o acesso via Cloudflare Tunnel (`docker/docker-compose.tunnel.yml`, `docker/Caddyfile.tunnel`, `scripts/tunnel-up.sh`, `docker/.env.tunnel.example`) conforme `quickstart.md`
- [x] T124 [P] Acessibilidade (foco, ARIA, contraste) e revisão pt-BR em toda a UI
- [x] T125 [P] Testes E2E Playwright (auth/2FA, offline + reconexão, meta batida/não batida, card, feed) em `apps/web/tests/e2e/`
- [x] T126 [P] Atualizar `README.md` e `docs/` com setup, túnel e operação
- [x] T127 Executar todos os portões (`pnpm lint`, `pnpm typecheck`, `test:shared`, `test:web`, `test:contract`, `test:pb`, `test:e2e`) e validar `quickstart.md`, incluindo os passos 10–13 (reabertura, mudança do dia de início, abandono na meta de livros e limites do catálogo)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sem dependências.
- **Foundational (Phase 2)**: depende do Setup — **bloqueia todas as user stories**.
- **User Stories (Phases 3–10)**: dependem da Fundação; podem ir em paralelo, ou em ordem de prioridade (P1 → P2 → P3).
- **Polish (Phase 11)**: depende das stories desejadas concluídas.

### User Story Dependencies

- **US1 (P1)**: base de acesso/espaço.
- **US2 (P1)**: depende de US1 (espaço/auth); alimenta US3.
- **US3 (P1)**: depende de US2 (logs de páginas); alimenta US4 e US5.
- **US4 (P2)**: depende de US3 (períodos).
- **US5 (P2)**: depende de US3.
- **US6 (P2)**: depende de US2/US3 (eventos) e US1 (espaço).
- **US7 (P3)**: depende de US2 (acervo).
- **US8 (P3)**: depende de US3 (motor de metas) e US6 (espaço/feed).

### Within Each User Story

- Testes escritos e falhando antes da implementação (quando aplicável).
- Schemas/regras puras (`packages/shared`) antes de stores/endpoints.
- Models antes de services; services antes de endpoints/UI.

### Parallel Opportunities

- Todas as tarefas do Setup e da Fundação marcadas [P].
- Após a Fundação, US1 pode iniciar; à medida que US2/US3 se estabilizam, as demais podem rodar em paralelo.
- Regras puras e testes em `packages/shared` são paralelizáveis por domínio.

---

## Implementation Strategy

### MVP First (US1 → US2 → US3)

1. Phase 1 (Setup) + Phase 2 (Foundational).
2. US1 (acesso/espaço), US2 (acervo/progresso), US3 (metas com graça).
3. **PARAR e VALIDAR**: login, registrar páginas, fechar a meta semanal (batida/não batida) e conferir dashboards básicos.
4. Deploy/demo via Cloudflare Tunnel.

### Incremental Delivery

1. Fundação → base pronta.
2. US1 → validar → demo.
3. US2 → validar → demo.
4. US3 → validar → **MVP de valor** → demo.
5. US4/US5 → celebração e visibilidade.
6. US6 → social; US7 → descoberta; US8 → metas de livros/desafios.
7. Polish (notificações, sync badge, túnel, a11y, E2E).

---

## Notes

- [P] = arquivos diferentes, sem dependências pendentes.
- [Story] mapeia a tarefa à user story (rastreabilidade).
- Cada user story deve ser completável e testável isoladamente.
- Verifique que os testes falham antes de implementar.
- Commit após cada tarefa ou grupo lógico.
- Evite: tarefas vagas, conflitos no mesmo arquivo, dependências cross-story que quebrem a independência.

---

## Phase 12: Convergence

**Purpose**: Fechar a lacuna entre o que a spec/plan/tasks pedem e o que o código atual implementa.
**Escopo avaliado**: monorepo `apps/`, `packages/shared/`, `docker/` (conforme plan/tasks). Sem alterações em código por este comando.

- [x] T128 Aplicar LWW no `POST /api/sync/push` usando `@ml/shared` `resolveLWW` e sinalizar `conflict=true` quando as versões divergirem (remover sobrescrita incondicional por `sync_id`) per Constitution II / FR-028 (partial) — CRITICAL
- [x] T129 Implementar US1 backend: libs `magic-link.js`, `totp.js`, `stepup.js`, `mailer.js` e rotas `auth.pb.js`, `devices.pb.js`, `space.pb.js` (criação de espaço, convites por token, aceite com RBAC, step-up em ações sensíveis) em `apps/pocketbase/pb_hooks/` per US1, FR-001/002/003/007 (missing) — CRITICAL
- [x] T130 Implementar US1 UI real (`LoginView.vue`, `TwoFactorView.vue`, `OnboardingView.vue`, `space-api.ts`, guards 401→login) e **remover o bypass dev** (`setToken('dev')`) per US1/AC1–6, Constitution I (missing/unrequested) — HIGH
- [x] T131 Persistir no Dexie os registros e tombstones recebidos em `GET /api/sync/pull` (loop de mirror em `apps/web/src/stores/sync.ts`) per FR-028, Constitution II (partial) — HIGH
- [x] T132 Implementar endpoints de metas `goals.pb.js` (goals list/create, goal-periods list/current, reabertura auditada `POST /goal-periods/{id}/reopen`, fechamento por cron) e testes `goals.test.ts` per US3, FR-014–019 (missing) — HIGH
- [x] T133 Implementar UI/CRM de metas (`stores/goals.ts`, `GoalForm.vue`, `GoalProgress.vue`) e integrar recálculo per US3, FR-014/018 (missing) — HIGH
- [x] T134 Disparar recálculo de metas em update/delete de `reading_logs` e em transições de `user_books.status` (`abandonado`) per FR-018, FR-036 (partial) — MEDIUM
- [x] T135 Implementar conquistas: endpoint `achievements` e geração/exportação do card (`useAchievementCard`, `share.ts`, `AchievementView.vue`) com testes per US4, FR-020/021 (missing) — HIGH
- [x] T136 Implementar dashboard: `GET /api/dashboard` + `PagesChart.vue` + `DashboardView.vue` (progresso, restantes, dias, streak) per US5, FR-022 (missing) — HIGH
- [x] T137 Implementar feed social: `GET /feed`, posts, reactions, comments + `FeedView.vue`, `PartnerProgress.vue` e materialização de eventos per US6, FR-023/024 (missing) — HIGH
- [x] T138 Implementar recomendações: endpoints `recommendations` (list/dismiss/add) + store + `RecommendationsView.vue`, com cache TTL 30d e fallback interno per US7, FR-025/037 (missing) — MEDIUM
- [x] T139 Implementar US8: endpoints de `challenges` (guard `owner|partner`), progresso somado e `ChallengesView.vue`; concluir integração da métrica `livros` per US8, FR-026 (missing) — MEDIUM
- [x] T140 Implementar de fato `GET /api/catalog/search` (proxy/parse do Open Library com limite 10, timeout 3s e degradação) em `apps/pocketbase/pb_hooks/routes/reading.pb.js` per FR-008/FR-013 (partial) — MEDIUM
- [x] T141 Implementar notificações Web Push (app `apps/notifier/` + `usePush.ts` + preferências) per FR-029 (missing) — MEDIUM
- [x] T142 Adicionar `apps/web/Dockerfile` (build estático + serve) usado por `docker/docker-compose.tunnel.yml` per FR-031, plan: deploy (missing) — MEDIUM
- [x] T143 Adicionar teste de integração de `books/user_books/reading_logs` (isolamento por `space`, soft delete, recálculo) em `apps/pocketbase/tests/library.test.ts` per T072 (missing) — LOW
- [x] T144 Adicionar suíte E2E Playwright (auth/2FA, offline+reconexão, meta batida/não batida, card, feed) em `apps/web/tests/e2e/` per T125 (missing) — LOW
- [x] T145 Concluir polish: revisão de acessibilidade/pt-BR e `SyncBadge.vue` com sincronização manual, último erro e tentativas per T124, FR-030 (partial) — LOW

---

## Phase 13: Convergence

**Purpose**: Fechar lacunas residuais entre spec/plan/tasks e o código (segunda passagem de convergência).
**Escopo avaliado**: `apps/pocketbase/pb_hooks/`, `apps/web/src/`, `apps/notifier/`. Sem alterações em código por este comando.

- [x] T146 Materializar conquistas `meta_nao_batida` no fechamento do período em `apps/pocketbase/pb_hooks/lib/goals-engine.js` (hoje só `meta_batida`), com payload determinístico per FR-020, US4/AC4 (partial) — MEDIUM
- [x] T147 Calcular o progresso somado dos desafios e fechar por graça (mesmas regras das metas) em `apps/pocketbase/pb_hooks/routes/feed.pb.js` (ou `challenges` engine + cron) per FR-026, US8/AC2 (partial) — MEDIUM
- [x] T148 Conectar Web Push à UI (opt-in) e persistir assinaturas via endpoints de `notification_preferences`; usar `apps/web/src/composables/usePush.ts` per FR-029 (partial) — MEDIUM
- [x] T149 Implementar fluxo de revalidação 2FA step-up ao receber `step_up_required` (403) no client (`apps/web/src/api/client.ts` + UI de step-up) per FR-007 (partial) — MEDIUM
- [x] T150 Exibir contagem de tentativas da Outbox no estado de sync (`apps/web/src/stores/sync.ts` e `SyncBadge.vue`) per FR-030 (partial) — LOW
- [x] T151 Adicionar prompt controlado de atualização do PWA (`onNeedRefresh`/`vite-plugin-pwa`) sem interromper sync em andamento per Constitution VIII, FR-027/plan PWA (partial) — LOW

---

## Phase 14: Convergence

**Purpose**: Terceira passagem — fechar refinamentos residuais de FR-024/FR-029 e polimento.
**Escopo avaliado**: `apps/pocketbase/pb_hooks/`, `apps/web/src/`, `apps/notifier/`. Sem alterações em código por este comando.

- [x] T152 Permitir que membros do espaço vejam as metas/progresso uns dos outros (endpoint/painel de espaço não escopado só ao `owner`) e usar `PartnerProgress.vue` no feed/dashboard per FR-024, US6 (partial) — MEDIUM
- [x] T153 Implementar entrega real de Web Push (VAPID) no `apps/notifier/` para as assinaturas salvas em `notification_preferences` per FR-029 (partial) — MEDIUM
- [x] T154 Incluir os livros lidos no período no `payload` da conquista em `apps/pocketbase/pb_hooks/lib/goals-engine.js` per FR-020, US4/AC1 (partial) — LOW
- [x] T155 Tratar sessão expirada (401) globalmente no client (`apps/web/src/api/client.ts` + router): limpar sessão e redirecionar ao login per FR-007, T070 (partial) — LOW
- [x] T156 Desabilitar desafios conjuntos quando o espaço tem um único membro, exibindo estado apropriado em `ChallengesView.vue` per US6, Edge Cases (partial) — LOW
