# MEMÓRIA — Minha Leitura

Memória de trabalho do projeto: pontos de restauração e plano aprovado.

## Ponto de restauração (baseline antes da Fase 1)

- **minha-leitura**: commit **`f6631a8`** (2026-10-13) — branch `main`, árvore limpa.
  - Voltar para cá: `git reset --hard f6631a8` (ou `git checkout f6631a8`).
- **controle-financeiro**: commit **`6af4c2b`** (referência cruzada; não é alvo das fases atuais).

## Plano aprovado (roadmap “ler mais”)

Ordem de implementação (cada fase entrega valor):

1. **Fase 1 — Fundação**: migrações (reading_logs `minutes`/`quote`/`quote_page`;
   user_books `review`/`review_public`/`queue_order`; notification_preferences
   `reminder_time`/`smart_reminders`/`partner_nudges`/`near_goal_nudges`;
   notifications.kind + `partner`/`near_goal`/`retrospective`; coleções
   `milestones` e `streak_freezes`) + `@ml/shared` + sync (push/pull/outbox).
2. **Fase 2 — Registro rápido + Diário**: card “Hoje” (faltam X, +10 páginas,
   continuar lendo), timer de leitura, nota/citação; tela **Diário** (linha do
   tempo, busca, compartilhar trecho).
3. **Fase 3 — Lembretes inteligentes + empurrões**: horário do lembrete, “só se
   não leu hoje”, nudge perto da meta, empurrão do casal.
4. **Fase 4 — Perdão de streak + Badges**: freeze/recuperação de 1 dia;
   badges de marcos (1º livro, 5/10/25/50, 7/30/100 dias, 1.000 páginas…).
5. **Fase 5 — Avaliação/resenha + Fila + Scanner**: meia-estrela + resenha
   pública (opt-in); fila “ler a seguir”; scanner de ISBN (BarcodeDetector +
   fallback manual).
6. **Fase 6 — Retrospectiva**: tela Mês/Ano com cartões compartilháveis +
   push automático no 1º dia do mês.

Decisões travadas: Retrospectiva = **Mês + Ano** (ano quando o mês encerra) com
push automático; avaliação = **meia-estrela + resenha pública**; Diário =
**opção B (completo)**.

## Progresso

- **Fase 1 — Fundação: ✅ concluída.** Campos em `reading_logs` (`minutes`,
  `quote`, `quote_page`), `user_books` (`review`, `review_public`,
  `queue_order`), `notification_preferences` (`reminder_time`,
  `smart_reminders`, `partner_nudges`, `near_goal_nudges`); `notifications.kind`
  + `partner`/`near_goal`/`retrospective`; coleções `milestones` e
  `streak_freezes`; `@ml/shared` e sync (push/pull/outbox) atualizados.

- **Fase 2 — Registro rápido + Diário: ✅ concluída.** Card “Hoje” no Início
  (meta do dia / “faltam X” / +10 / +20 páginas / continuar), timer de leitura
  persistente, nota + citação no registro e tela **Diário** (linha do tempo,
  busca, filtro por livro, “só citações”, compartilhar trecho).

- **Fase 3 — Lembretes inteligentes + empurrões: ✅ concluída.** Notifier:
  lembrete no horário escolhido (só se não leu hoje, quando “inteligente”),
  empurrão do casal (após 18h) e “perto da meta” (≥70%, após 12h, 1×/período).
  Preferências no Perfil: lembrete inteligente, empurrão do casal, perto da meta
  e horário do lembrete.

- **Fase 4 — Perdão de streak + Badges: ✅ concluída.** Status `congelado`
  (streak continua), endpoints `/api/streaks/status` e `/api/streaks/freeze`
  (1 congelamento a cada 7 dias; protege o período perdido), card de recuperação
  nas Metas. Badges de marcos (livros/páginas/streak) avaliados no motor de metas
  + notificação `milestone` + seção “Marcos” nas Conquistas.

## Estado atual (resumo)

PWA offline-first (Vue 3 + Dexie) + PocketBase; sync idempotente por `sync_id`;
estante compartilhada com leitura por pessoa; metas por dia/semana/mês com
fechamento; conquistas; duelos; feed social opt-in; notificações configuráveis +
Web Push (notifier em ~1 min); Magic Link + 2FA com step-by-step/recovery codes;
publicação via Tailscale Funnel (`https://minha-leitura.tail0d24e6.ts.net`).
