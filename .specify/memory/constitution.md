<!--
Sync Impact Report
- Version change: 1.0.0 → 2.0.0
- Modified principles: I. Segurança, Privacidade e Isolamento do Acervo — adicionada a exceção
  "conteúdo público opt-in" (posts marcados como `public`).
- Added sections: N/A (exceção registrada dentro do Princípio I)
- Removed sections: N/A
- Rationale do MAJOR: redefinição do escopo de um princípio NON-NEGOTIABLE (isolamento por
  `space`) para permitir leitura/interação cross-space APENAS de conteúdo explicitamente
  público, mantendo todo dado de leitura isolado.
- Templates/commands: dependentes leem esta constituição em runtime; nenhum template foi alterado.
- Follow-up: refletir `posts.visibility` e a coleção `follows` no data-model/contratos da feature.
-->

# Minha Leitura Constitution

## Core Principles

### I. Segurança, Privacidade e Isolamento do Acervo (NON-NEGOTIABLE)

Todo dado de leitura pertence a um único `space` (o espaço do casal/usuário), e o
isolamento entre `spaces` é obrigatório em todas as camadas. As regras abaixo são
invioláveis e seguem os mesmos moldes do `controle-financeiro`:

- Toda query, mutação e gravação DEVE filtrar e validar `space_id`; acesso
  cross-space é proibido e DEVE falhar em teste, **exceto pelo conteúdo público opt-in
  descrito abaixo**.
- **Conteúdo público opt-in (exceção explícita)**: um `post` marcado como `public` PODE ser
  lido por qualquer usuário autenticado que o siga, e é o **único** tipo de dado autorizado a
  cruzar `spaces`. Estante, logs de leitura, metas, avaliações e quaisquer outros dados de
  leitura permanecem isolados por `space`. Reações e comentários em posts públicos SÃO
  permitidos entre contas, sempre resolvidos e validados no backend (nunca no cliente).
  O padrão de todo conteúdo é privado (`space`); a exposição é uma escolha explícita do autor.
- Regras de negócio, RBAC, permissões e validações DEVEM ser aplicadas SEMPRE no
  backend (PocketBase: API rules + hooks). O frontend NUNCA é fonte de confiança
  para autorização ou integridade.
- Autenticação usa Magic Link + 2FA por step-up (TOTP); ações sensíveis (convidar/remover
  membro, alterar papéis, exportar dados, apagar histórico de leitura, alterar
  configurações de segurança) DEVEM revalidar 2FA.
- Menor privilégio é o padrão: papéis (`owner | partner | viewer`) recebem apenas as
  permissões necessárias.
- Exclusões DEVEM ser soft delete (`deleted_at`); nenhum dado de leitura é removido
  fisicamente no fluxo normal.
- Ações sensíveis DEVEM gerar registro em `AuditLog` (quem, quando, antes/depois).

**Rationale**: o acervo, o histórico e as metas são dados pessoais íntimos do casal;
isolamento, rastreabilidade e defesa em profundidade evitam exposição indevida, e confiar
no cliente é a falha de segurança mais provável.

### II. Offline-First Confiável

O app DEVE funcionar sem rede. A escrita é local-first e a sincronização é previsível:

- Toda criação/edição/exclusão é gravada primeiro no IndexedDB (Dexie.js) e enfileirada
  na **Outbox** antes de qualquer chamada de rede.
- A sincronização DEVE ser idempotente: toda operação carrega `sync_id` (UUID gerado no
  cliente) e o servidor deduplica por `(space_id, sync_id, entidade)`.
- O servidor é o **source-of-truth**; pull DEVE ser por delta (cursor) e incluir
  soft deletes.
- Conflitos seguem regra previsível e documentada: Last-Write-Wins por `updated_at`
  (UTC do servidor), servidor vence em empate, e conflitos DEVEM ser sinalizados
  (`conflict=true`) em vez de sobrescritos silenciosamente.
- A Outbox DEVE preservar ordem (FIFO), suportar retry e registrar falhas; itens órfãos
  (update de registro já deletado) DEVEM ser descartados com aviso, nunca recriados.

**Rationale**: a leitura acontece em trânsito, na cama ou sem sinal; registrar páginas
lidas precisa funcionar imediatamente. Sem idempotência e regras de conflito explícitas a
base corrompe de forma invisível.

### III. Metas Determinísticas e Corretas (NON-NEGOTIABLE)

O cálculo de metas é o coração do produto e DEVE ser determinístico, testável e
independente de fuso ambíguo:

- Metas são definidas por `páginas` ou por `livros` em um período (`dia | semana | mês`),
  com dia de início configurável (ex.: semana começa na segunda e fecha no domingo).
- A meta semanal/mensal é um **orçamento de páginas**, não uma cobrança diária: o usuário
  compensa dias não lidos em outros dias do mesmo período (ex.: 140/semana = 20/dia).
- O fechamento do período DEVE ter **janela de graça** configurável (ex.: até 24 h após o
  fim do período) para lançar as páginas do último dia; após a graça o período é fechado
  como `batida` ou `não batida` de forma imutável (reabertura só via ação auditada).
- Cálculos DEVEM usar o fuso de negócio configurado (`CF_TIMEZONE`, default
  `America/Sao_Paulo`) e a semana DEVE respeitar o dia de início escolhido.
- O mesmo conjunto de lançamentos DEVE produzir sempre o mesmo resultado; nenhuma regra de
  meta pode viver apenas na UI.

**Rationale**: se o número da meta oscila ou fecha errado, a confiança e a motivação
acabam; a correção do cálculo é requisito de produto, não detalhe.

### IV. Testes Automatizados das Regras de Negócio (NON-NEGOTIABLE)

Regras de negócio DEVEM ter testes automatizados e verificáveis antes de serem consideradas
concluídas. Cobertura obrigatória mínima:

- Metas: agregação por dia/semana/mês, compensação de páginas, semana com início
  configurável, janela de graça de fechamento, streak e virada de período/mês.
- Progresso: páginas lidas, páginas restantes do livro, atualização de status
  (`quero ler | lendo | lido | abandonado`) e regras de consistência.
- Recomendações: geração determinística a partir de gêneros/tags/notas e deduplicação.
- Conquistas/artes compartilháveis: decisão `batida/não batida` e conteúdo do card.
- Sync/conflitos: idempotência por `sync_id`, delta pull, LWW, soft delete e casos de borda
  (create vs delete, delete vs update, reenvio após retry).
- Segurança: isolamento por `space` e enforcement de RBAC no backend.

Testes DEVEM falhar quando a regra é violada; mocks que contornam a regra real no backend
não são aceitos como evidência.

**Rationale**: metas erradas e sincronização silenciosamente corrompida destroem o valor do
app; teste dessas regras não é opcional.

### V. Simplicidade e Evolução Incremental

- O MVP DEVE ser enxuto e priorizar o caminho de maior valor para o casal.
- É proibido overengineering: abstrações, camadas e generalizações DEVEM ter uso concreto
  no escopo atual.
- Complexidade adicionada DEVE ser justificada com requisito verificável.
- Decisões DEVEM manter o sistema migrável (PocketBase hoje; alternativas futuras sem
  reescrita do domínio) e preparado para evolução (mais leitores, outros catálogos)
  sem ativá-los prematuramente.

**Rationale**: entregar valor real cedo vale mais que completude teórica; o app é para uso
pessoal e leve.

### VI. UX Mobile-First, Acessível e pt-BR

- A interface DEVE ser mobile-first e utilizável no PWA instalado.
- Acessibilidade DEVE ser tratada como requisito (navegação por teclado, foco, contraste,
  rótulos ARIA), não como melhoria posterior.
- Todo texto ao usuário DEVE estar em **pt-BR**; datas e números formatados em `pt-BR`.
- A UI DEVE comunicar estado offline/sync de forma explícita (badge, itens pendentes,
  ação de sincronizar) sem bloquear a interação.

**Rationale**: o app é usado no celular, no dia a dia, por mais de uma pessoa; clareza e
acessibilidade são funcionais.

### VII. Conteúdo Gerado e Compartilhamento Confiável

- A arte de conquista (card de meta batida/não batida) DEVE ser gerada de forma
  determinística a partir do estado da meta, com dados reais do período.
- O card DEVE ser compartilhável (imagem/arquivo) sem expor dados sensíveis além do que o
  próprio usuário escolher exibir.
- Geração do card DEVE funcionar offline a partir dos dados locais e ser reproduzível.

**Rationale**: o card é o elemento "legal" que celebra a conquista; se mostrar número errado
ou vazar dado, o incentivo vira constrangimento.

### VIII. Observabilidade e Versionamento Claros

- Operações de sync, autenticação e ações sensíveis DEVEM emitir logs estruturados
  (contexto, `space_id`, `user_id`, resultado), sem expor segredos ou dados sensíveis.
- Erros e falhas de sincronização DEVEM ser observáveis e diagnosticáveis pelo usuário e
  pelo operador (contagem de Outbox, último erro, tentativas).
- Versões de API, esquema de dados e service worker DEVEM seguir versionamento claro e
  compatível; mudanças incompatíveis exigem plano de migração.
- Atualizações de PWA DEVEM ser controladas por prompt explícito, sem interromper
  sincronizações em andamento.

**Rationale**: offline-first e múltiplos dispositivos tornam invisível o que não é
observado; versionar com clareza evita quebra silenciosa.

## Stack e Restrições Técnicas

Stack canônica do projeto (não substituir sem emenda à constituição):

- **Frontend**: PWA com Vue 3 + Vite + TypeScript (strict), Tailwind CSS + shadcn-vue.
- **Offline**: Dexie.js (IndexedDB) + Vite PWA (Workbox), Outbox local.
- **Validação**: Zod no client e no server.
- **Backend**: PocketBase self-host (collections, API rules/hooks); alternativa de
  migração futura sem reescrita do domínio.
- **Auth**: Magic Link + TOTP (2FA step-up) + WebAuthn Platform Auth (App Lock opcional).
- **Notificações**: Web Push com VAPID (opt-in explícito por usuário) — avisos de meta e
  fechamento de período.
- **Sync**: `POST /api/sync/push` e `GET /api/sync/pull?since=<cursor>` com delta,
  `sync_id` e soft delete.
- **Catálogo externo**: consultas a catálogos **gratuitos** (ex.: Open Library) apenas para
  metadados/capas e sugestões; indisponível ou com falha NÃO pode bloquear o fluxo.
- **Acesso (teste)**: Cloudflare Tunnel (`docker-compose.tunnel.yml` + `scripts/tunnel-up.sh`),
  reaproveitando o padrão do `controle-financeiro`.

Restrições: entidades multi-tenant exigem `space_id`; exclusões usam `deleted_at`;
contratos entre camadas são validados por Zod; nenhuma regra de negócio pode viver apenas
no frontend; cálculos de meta usam `CF_TIMEZONE`.

## Fluxo de Desenvolvimento e Portões de Qualidade

O fluxo SDD do projeto é: `constitution → specify → (clarify) → plan → tasks →
(analyze/checklist) → implement → converge` (ver `COMANDOS.md`).

Portões obrigatórios antes de considerar uma entrega concluída:

- Lint e checagem de tipos (TypeScript strict) passam sem erros.
- Testes das regras de negócio afetadas passam (Princípios III e IV).
- Nenhuma violação de isolamento por `space` ou de validação server-side.
- Sem `any` implícito e sem validação de negócio exclusivamente no client.
- Complexidade nova justificada por requisito verificável.

## Governance

- Esta constituição supersede demais práticas e convenções do projeto; em conflito, ela
  prevalece.
- Emendas DEVEM ser documentadas, aprovadas e acompanhadas de plano de migração quando
  incompatíveis; os arquivos `COMANDOS.md` e `docs/` servem de guia de execução em runtime.
- Versionamento semântico da constituição:
  - **MAJOR**: remoção ou redefinição incompatível de princípios/governança.
  - **MINOR**: novo princípio/seção ou expansão material de orientação.
  - **PATCH**: clarificações, correções de texto e refinamentos não semânticos.
- Toda revisão/PR DEVE verificar conformidade com os princípios; desvios exigem
  justificativa explícita e registrada.
- A conformidade é revisada a cada mudança de princípio e sempre que uma feature tocar
  segurança, sync ou cálculo de metas.

**Version**: 2.0.0 | **Ratified**: 2026-10-11 | **Last Amended**: 2026-10-12
