# Research — Minha Leitura

**Fase 0** — decisões técnicas que fundamentam o `plan.md`. Cada decisão registra escolha,
alternativas descartadas e impacto nos princípios da constituição.

## D1. Modelo de período e dia de início

**Decisão**: função pura `resolvePeriod(goal, referenceDate, timezone)` em
`@ml/shared/src/domain/period.ts`, retornando `{ startDate, endDate, graceUntil }`.

- `dia`: início = próprio dia (00:00–23:59:59 no fuso).
- `semana`: início no `week_start` configurado (0=domingo..6=sábado); ex.: 1 = segunda,
  fim = domingo.
- `mes`: dia 1 ao último dia do mês civil.
- Cálculo com `date-fns-tz` usando `CF_TIMEZONE`; conversões só na fronteira (string
  `YYYY-MM-DD`).
- **Mudança do dia de início** (`week_start`) com período aberto só vale a partir do
  **próximo período**: `resolvePeriod` deriva as fronteiras vigentes a partir de
  `goals.starts_on`/histórico; o período aberto e os fechados mantêm as fronteiras originais
  (FR-035), evitando re-bucket de lançamentos já contabilizados.

**Alternativas descartadas**: usar UTC do navegador (metas viram erradas perto da meia-noite
e em DST); usar semanas ISO rígidas (não permitiria início na segunda no fim do mês em que
o usuário quer controle total).

**Princípios**: III (determinismo), IV (testável).

## D2. Compensação de páginas e fechamento com graça

**Decisão**: o progresso de um período é a **soma** dos `reading_logs` cujo `date` cai entre
`startDate` e `endDate` (inclusivo). Não há penalidade diária; o alvo é um orçamento
acumulado. `status`:

- `aberto` enquanto `now <= graceUntil` ou `progress < target` e ainda dentro da graça.
- `batida` quando `progress >= target` (pode ocorrer antes do fim; permanece até fechar).
- `nao_batida` quando `now > graceUntil` e `progress < target`.

`graceUntil = endDate 23:59:59 + grace_hours` no fuso. O fechamento grava `closed_at` e
torna-se imutável.

- **Reabertura** (FR-017): restrita a membros com papel de edição (`owner | partner`) via
  `POST /goal-periods/{id}/reopen` com step-up; grava `reopened_at` em `goal_periods` e
  entrada em `audit_logs` (com `before/after`); retorna o período a `aberto` respeitando a
  graça e dispara recálculo de `progress`, `status`, `streak` e `achievements` afetados
  (conquista/card anterior marcado como desatualizado). `viewer` não reabre.
- **Metas de `livros`** (FR-036): contam apenas `user_books` com `status = lido` cuja
  `finished_at` cai no período; ao mudar para `abandonado`, o item é subtraído do progresso
  do período **aberto** (recalculado); períodos fechados permanecem imutáveis.

**Alternativas descartadas**: forçar quitação diária (contraria o pedido e desmotiva);
fechar no fim do dia sem graça (perde o lançamento da leitura da noite); permitir reabertura
por `viewer`/sem auditoria (quebraria a imutabilidade e o Princípio I).

**Princípios**: III, IV, VII.

## D3. Cálculo no cliente e no servidor com a mesma função pura

**Decisão**: toda a matemática de período/meta/progresso/streak vive em
`@ml/shared/domain`. O client usa para render offline; os hooks do PocketBase usam o mesmo
bundle para fechar períodos e validar. `goal_periods` fechados são persistidos; abertos são
deriváveis.

**Alternativas descartadas**: calcular só no client (violaria "nenhuma regra só no front");
duplicar fórmula no backend (risco de divergência).

**Princípios**: III, IV, V.

## D4. Geração do card compartilhável

**Decisão**: gerar no client, offline, em `<canvas>` (via composable `useAchievementCard`)
usando o tema salvo; exportar PNG e usar `navigator.share`/download. `payload` do card é
determinístico (mesmos dados ⇒ mesma imagem). Sem render no servidor no MVP.

**Alternativas descartadas**: render server-side (precisa rede, quebra offline); HTML→print
(menos confiável no iOS).

**Princípios**: VII, VI.

## D5. Catálogo externo gratuito

**Decisão**: **Open Library** como fonte primária (busca por título e ISBN, `/search.json` e
`/isbn/{isbn}.json`, capas via covers API), sem chave. Timeout curto (3 s), validação Zod da
resposta, cache local em Dexie. Falha → cadastro manual e recomendações internas. Google
Books opcional atrás de flag.

**Limites de dados (FR-037)**:

- Persistir no espaço **apenas metadados que o usuário adotar no acervo** (`books`); buscas e
  sugestões externas são cache **efêmero** com TTL de **30 dias** (`catalog_cache`), nunca
  fonte de verdade.
- **Máx. 10 resultados por consulta** (`/catalog/search`); paginação/limite aplicado no
  client e nos hooks.
- Cache de capas com **teto de ~100 capas / 50 MB** e descarte **LRU** (`cover_cache`), sem
  sincronizar blobs.
- Requisições com **timeout + backoff**; qualquer falha degrada para o acervo interno sem
  bloquear cadastro, estante ou recomendações.

**Alternativas descartadas**: Google Books como primária (cota/chave); depender de catálogo
pago (assumption da spec); persistir todo o catálogo sem TTL (cresceria sem controle, afetando
storage/privacidade).

**Princípios**: V, VI.

## D6. Recomendações

**Decisão**: algoritmo determinístico em `@ml/shared/domain/recommend.ts`:

1. Perfil do usuário = contagem de gêneros/tags e média de `rating`/favoritos dos `lido`.
2. Candidatos = catálogo externo por gênero/autor favoritos (quando online) + itens `quero_ler`.
3. Excluir o que já está em `user_books` (qualquer status, exceto talvez `quero_ler` para
   reforço) e `dismissed`.
4. Score = similaridade de gêneros/tags + bônus de autor + popularidade; ordenação estável
   por `score` e `title`.
5. `reason` em pt-BR a partir da maior contribuição de score.

**Alternativas descartadas**: ML/modelo externo (overengineering para 2 usuários); aleatório
(não explica "o porquê").

**Princípios**: V, VII.

## D7. Eventos de feed e interações

**Decisão**: eventos de feed são derivados de fatos de domínio (`livro_concluido`,
`meta_batida`) por regra pura (`deriveFeedEvents`) e materializados em `posts` no backend
para permitir curtidas/comentários persistidos. Eventos manuais são permitidos. Índices
únicos evitam posts duplicados por `sync_id`.

**Alternativas descartadas**: feed 100% derivado (não dá para curtir/comentar por id
estável); notificação em tempo real via WebSocket (desnecessário para 2 usuários; push
cobre o essencial).

**Princípios**: II, V.

## D8. Reaproveitamento de segurança e acesso

**Decisão**: copiar/adaptar do `controle-financeiro`:

- Collections + API rules + hooks (Magic Link, TOTP step-up, crypto AES-GCM, ratelimit,
  audit).
- Substituir `household` por `space`.
- `docker/docker-compose.tunnel.yml`, `docker/Caddyfile.tunnel`, `scripts/tunnel-up.sh`
  para publicação via Cloudflare quick tunnel (`/api` e `/_` → PocketBase; resto → PWA).

**Alternativas descartadas**: reescrever auth/security do zero (tempo e risco); expor
PocketBase diretamente sem túnel (sem HTTPS no teste).

**Princípios**: I, II, V.

## D9. Sincronização offline

**Decisão**: mesmo motor da referência — `sync_id` UUID no client, dedup
`(space, entity, sync_id)`, `push` em lote, `pull` por cursor via `change_log`, soft deletes
e LWW por `updated_at` do servidor com `conflict=true`. Entidades sincronizáveis:
`books`, `user_books`, `reading_logs`, `goals`, `goal_periods` (fechados), `achievements`,
`posts`, `reactions`, `comments`, `challenges`.

**Alternativas descartadas**: sync campo-a-campo (complexo); last-write por client clock
(relógios divergentes).

**Princípios**: II, VIII.

## D10. Notificações

**Decisão**: Web Push (VAPID) opt-in. Gatilhos: lembrete de meta perto do fim do período,
aviso de graça encerrando e novos itens/interações no feed. Um app `notifier` (cron) no
padrão da referência, opcional por perfil no compose.

**Alternativas descartadas**: e-mail (mais fricção, menos imediato); sem notificações
(perde o empurrão para fechar metas).

**Princípios**: VIII, VI.
