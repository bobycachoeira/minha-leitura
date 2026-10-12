# Feature Specification: Minha Leitura — Rastreamento de Leitura com Metas e Feed do Casal

**Feature Branch**: `001-leitura-metas`

**Created**: 2026-10-11

**Status**: Draft

**Input**: User description: "Software para marcar minhas leituras: cadastrar livros que li, que estou lendo, que quero ler e indicações baseadas no que já li e gostos. Sistema de metas baseado em páginas por dia/semana/mês (ex.: 140 páginas por semana = 20/dia, compensando dias não lidos em outros). Ao bater a meta, gerar algo compartilhável. Poder setar o dia de início (ex.: segunda fechando no domingo), permitindo dizer as páginas lidas até 24h após fechar o período; ao informar a do último dia, gerar a arte de batida/não batida. Dashboards de status da meta e metas de livros. Estilo uma rede social bem leve, por enquanto só eu e talvez minha esposa. Seguir os moldes de banco e login/segurança do controle-financeiro e acesso via Cloudflare (para teste)."

## Clarifications

### Session 2026-10-11

- Q: Arquitetura offline? → A: **Offline-first**, nos mesmos moldes do `controle-financeiro`
  (Dexie + Outbox + sync idempotente com `sync_id`, servidor como source-of-truth).
- Q: Stack de frontend? → A: **Vue 3 PWA + Vite + TypeScript (strict) + Tailwind CSS + shadcn-vue**.
- Q: Como gerar recomendações? → A: **Acervo interno + catálogo externo gratuito**
  (ex.: Open Library) apenas para metadados/capas e sugestões; falha externa não bloqueia.
- Q: Nível social? → A: **Perfil + feed + desafios** (curtidas, comentários e metas conjuntas).
- Q: Banco/login? → A: **PocketBase + Magic Link + TOTP 2FA step-up + RBAC por espaço**,
  isolamento por `space_id`, soft delete e auditoria.
- Q: Acesso em teste? → A: **Cloudflare Tunnel** (quick tunnel), reaproveitando o padrão da referência.
- Q: Modelo de meta padrão? → A: **Orçamento de páginas por período com compensação**; exemplo
  canônico: 140 páginas/semana (20/dia) com semana de segunda a domingo e **janela de graça de 24 h**.
- Q: Mudança do dia de início no meio de um período aberto? → A: **Vale só a partir do próximo
  período**; o período aberto fecha com as fronteiras originais e períodos fechados permanecem
  imutáveis (nenhum relançamento retroativo).
- Q: Política de reabertura de período fechado? → A: **Membro com papel de edição** (`owner`/`partner`)
  pode reabrir, com registro em `AuditLog`; progresso/status são recalculados e o período volta a
  `aberto` respeitando a graça; **streak e conquistas são recalculados** (card anterior pode ser
  marcado como desatualizado).
- Q: Efeito do livro `abandonado` na meta de livros? → A: **Somente livros `lido` contam** (por
  `finished_at`); abandonar remove o livro do progresso do período **aberto** (recalcula), mas
  períodos já fechados permanecem imutáveis.
- Q: Limites de dados do catálogo externo? → A: **Persistir no espaço só os metadados que o usuário
  adotar no acervo**; cache temporário de buscas/sugestões com **TTL de 30 dias**, **máx. 10
  resultados por consulta** e **cache de capas com teto** (~100 capas/50 MB, descarte LRU), sempre
  com timeout/backoff e degradação para o acervo interno.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Acesso seguro e espaço do casal (Priority: P1)

Uma pessoa entra no app sem senha, via Magic Link enviado por e-mail. Em dispositivos
desconhecidos ou em ações sensíveis, o sistema exige um segundo fator (TOTP). A pessoa cria
um **espaço** (o "casal") e convida a esposa por token seguro; cada uma passa a ver o
acervo, o progresso e as metas dentro do mesmo espaço, isolado de qualquer outro espaço.

**Why this priority**: sem acesso seguro e isolamento por espaço, nenhuma funcionalidade de
leitura pode existir com confiança ou privacidade.

**Independent Test**: solicitar Magic Link, autenticar, ativar 2FA, criar o espaço, convidar
segundo membro e confirmar que dados de outro espaço jamais são acessíveis.

**Acceptance Scenarios**:

1. **Given** um e-mail autorizado, **When** a pessoa solicita o Magic Link, **Then** recebe um link de uso único que expira em 10–15 min e é invalidado após o primeiro uso.
2. **Given** 2FA ativo em dispositivo desconhecido, **When** conclui o Magic Link, **Then** o sistema exige um código TOTP válido antes de liberar o acesso.
3. **Given** uma ação sensível (convidar/remover membro, alterar papel, apagar histórico, mudar segurança), **When** executada, **Then** o sistema exige 2FA por step-up.
4. **Given** um `owner` autenticado sem espaço, **When** cria o espaço, **Then** vira `owner` e pode cadastrar livros imediatamente.
5. **Given** um convite válido de papel `partner`, **When** a convidada aceita, **Then** passa a membro do espaço e o convite é marcado como usado.
6. **Given** membros de espaços diferentes, **When** alguém tenta ler ou alterar dados de outro espaço, **Then** a operação é negada e auditada.

---

### User Story 2 - Acervo e progresso de leitura (Priority: P1)

A pessoa busca um livro (por título/ISBN) ou cadastra manualmente, organiza por status
(`quero ler | lendo | lido | abandonado`), registra a página atual, avalia e anota. O
acervo aparece como uma **estante visual** (grid com as capas dos livros), organizada por
status e busca, com progresso e avaliação visíveis. O progresso é atualizado ao longo do
tempo e o livro aparece nas visões certas.

**Why this priority**: registrar e acompanhar o acervo é o núcleo de valor; as metas
dependem dos lançamentos de páginas.

**Independent Test**: cadastrar um livro, movê-lo entre status, registrar páginas lidas em
dias diferentes e ver o progresso e a página atual coerentes.

**Acceptance Scenarios**:

1. **Given** um espaço ativo, **When** a pessoa cadastra um livro com total de páginas, **Then** ele entra como `quero ler` e pode ser movido para `lendo`.
2. **Given** um livro `lendo` com 300 páginas e página atual 100, **When** registra leitura até a página 150, **Then** o progresso mostra 150/300 e 50% concluído.
3. **Given** um livro `lendo`, **When** registra páginas até o total, **Then** o status muda para `lido` e a data de conclusão é registrada.
4. **Given** um livro com páginas inválidas (não numéricas/negativas/maior que o total), **When** salva, **Then** o sistema rejeita com mensagem clara e não persiste.
5. **Given** buscas por ISBN/título, **When** o catálogo externo gratuito responde, **Then** capa/metadados são preenchidos; **When** o catálogo falha ou está offline, **Then** o cadastro manual continua funcionando sem erro.
6. **Given** um lançamento de páginas, **When** editado ou excluído, **Then** a meta e o progresso são recalculados e a exclusão é soft delete auditado.
7. **Given** o acervo com livros cadastrados, **When** a pessoa abre a estante, **Then** os livros aparecem em um grid com a capa de cada um, e é possível filtrar por status e buscar por título/autor.
8. **Given** um livro sem capa (manual ou catálogo sem imagem), **When** exibido na estante, **Then** o app mostra uma capa-placeholder gerada a partir do título/autor, sem quebrar o layout.
9. **Given** a estante já visitada, **When** a pessoa abre o app offline, **Then** as capas em cache continuam visíveis e as ausentes caem no placeholder.

---

### User Story 3 - Metas de páginas com compensação, graça e fechamento (Priority: P1)

A pessoa cria metas por período (`dia | semana | mês`) com alvo em páginas, podendo definir
o **dia de início** (ex.: semana de segunda a domingo) e a **janela de graça** do
fechamento. O período funciona como orçamento: dias não lidos são compensados em outros
dias do mesmo período. Ao fim da graça, o período fecha como `batida` ou `não batida`.

**Why this priority**: o sistema de metas é o principal motor de motivação do produto e o
motivo do app existir.

**Independent Test**: definir 140 páginas/semana (seg→dom), lançar 100 páginas em 3 dias,
completar as 40 restantes no último dia (ou na graça) e ver o período fechar como `batida`.

**Acceptance Scenarios**:

1. **Given** uma meta semanal de 140 páginas com início na segunda, **When** a semana começa, **Then** o período cobre segunda 00:00 a domingo 23:59:59 no fuso `CF_TIMEZONE` (default `America/Sao_Paulo`).
2. **Given** a meta semanal ativa, **When** a pessoa lança 20 páginas na segunda e 0 na terça, **Then** o progresso acumula 20 e não há penalidade diária; ela pode compensar na quarta.
3. **Given** o total de 140 páginas atingido antes do fim do período, **When** o alvo é alcançado, **Then** o período é marcado `batida` e a conquista é liberada, mesmo sem ler todo dia.
4. **Given** o período encerrado sem atingir a meta, **When** ainda dentro da graça de 24 h, **Then** a pessoa consegue lançar as páginas do último dia e o período pode virar `batida`.
5. **Given** o período fora da graça sem atingir a meta, **When** a graça expira, **Then** o período fecha como `não batida` de forma imutável.
6. **Given** um período fechado, **When** a pessoa tenta reabrir, **Then** reabrir exige ação explícita e auditada (não silenciosa).
7. **Given** metas com início em dias diferentes, **When** calculadas, **Then** os limites de cada período respeitam o dia de início escolhido.

---

### User Story 4 - Conquista compartilhável ao bater a meta (Priority: P2)

Ao fechar um período como `batida` (ou ao atingir a meta), o app gera um **card
compartilhável** com os dados reais do período (período, páginas, livro(s), sequência de
dias), pronto para imagem e envio a quem quiser.

**Why this priority**: é o componente "legal" que celebra a conquista e dá razão social para
compartilhar o esforço.

**Independent Test**: bater a meta semanal, gerar o card, salvar/compartilhar a imagem e
validar que os números exibidos batem com o período.

**Acceptance Scenarios**:

1. **Given** um período `batida`, **When** a pessoa abre a conquista, **Then** vê um card com páginas lidas, alvo, período e livro(s) do período.
2. **Given** o card, **When** a pessoa escolhe compartilhar, **Then** o app exporta uma imagem legível e sem dados sensíveis além do exibido no card.
3. **Given** o app offline, **When** a pessoa gera o card, **Then** ele é gerado a partir dos dados locais e é idêntico ao card online para o mesmo estado.
4. **Given** um período `não batida`, **When** a pessoa abre o resultado, **Then** vê o card de encerramento com o quanto faltou, de forma respeitosa e motivadora.

---

### User Story 5 - Dashboards e status da meta (Priority: P2)

A pessoa vê painéis com o status das metas (progresso atual, páginas restantes, dias
restantes, sequência de períodos batidos), páginas por período e evolução da leitura.

**Why this priority**: visibilidade do progresso é o que sustenta o hábito e informa o que
compensar antes do fechamento.

**Independent Test**: abrir o dashboard com metas ativas e conferir que os números batem
com os lançamentos do período corrente.

**Acceptance Scenarios**:

1. **Given** uma meta semanal de 140 páginas com 90 lidas, **When** abre o dashboard, **Then** vê 90/140, 50 restantes e quantos dias faltam no período.
2. **Given** lançamentos no período, **When** vê o gráfico de páginas por dia, **Then** os totais do gráfico batem com os lançamentos.
3. **Given** histórico de períodos, **When** vê a sequência/streak, **Then** o número reflete os períodos consecutivos `batida` na ordem correta.

---

### User Story 6 - Feed social e interação do casal (Priority: P2)

Dentro do espaço, as pessoas veem um feed das atividades (terminou um livro, bateu uma meta,
grande avanço em páginas), curtem e comentam. Também veem as metas e o progresso uma da outra.

**Why this priority**: o aspecto social leve mantém o engajamento e a companhia no hábito,
que é parte central do pedido.

**Independent Test**: uma pessoa registra a conclusão de um livro, a outra vê no feed, curte
e comenta; a interação persiste.

**Acceptance Scenarios**:

1. **Given** um evento relevante (livro concluído, meta batida), **When** ocorre, **Then** aparece no feed do espaço com ator, tipo e resumo.
2. **Given** um item do feed, **When** a outra pessoa curte, **Then** a curtida é registrada e o contador reflete o estado.
3. **Given** um item do feed, **When** comenta, **Then** o comentário aparece com autor e horário em pt-BR.
4. **Given** interações, **When** qualquer pessoa de outro espaço tenta acessá-las, **Then** o acesso é negado.

---

### User Story 7 - Recomendações a partir do acervo e gostos (Priority: P3)

O app sugere próximos livros com base nos gêneros, tags, autores, notas e favoritos do
acervo, complementando com sugestões de um catálogo externo gratuito.

**Why this priority**: agrega valor de descoberta, mas depende de acervo e histórico já
existentes.

**Independent Test**: com vários livros avaliados, pedir recomendações e verificar que os
resultados são coerentes com os gostos e que itens já lidos não se repetem.

**Acceptance Scenarios**:

1. **Given** um acervo com gêneros/notas, **When** a pessoa pede recomendações, **Then** recebe sugestões alinhadas aos gostos, com o motivo ("porque você gostou de X").
2. **Given** livros já no acervo, **When** recomenda, **Then** itens já lidos/abandonados não são sugeridos novamente.
3. **Given** o catálogo externo indisponível, **When** pede recomendações, **Then** o app ainda recomenda a partir do acervo interno, sem erro.
4. **Given** uma sugestão, **When** a pessoa aceita, **Then** o livro pode ser adicionado ao acervo como `quero ler` em um toque.

---

### User Story 8 - Metas de livros e desafios conjuntos (Priority: P3)

Além de páginas, a pessoa cria metas de **quantidade de livros** por período. O casal pode
criar **desafios conjuntos** (ex.: ler X livros juntos no mês) com progresso somado.

**Why this priority**: amplia o sistema de metas e reforça o aspecto social, mas é evolução
após o núcleo de páginas/feed funcionar.

**Independent Test**: criar uma meta mensal de 2 livros e um desafio conjunto, concluir um
livro e ver a meta de livros e o progresso do desafio avançarem.

**Acceptance Scenarios**:

1. **Given** uma meta mensal de 2 livros, **When** a pessoa conclui um livro no mês, **Then** a meta mostra 1/2.
2. **Given** um desafio conjunto do casal, **When** qualquer membro conclui um livro contabilizado, **Then** o progresso do desafio soma para os dois.
3. **Given** um desafio, **When** o período fecha, **Then** o resultado (`batida`/`não batida`) segue as mesmas regras de graça e imutabilidade das metas.

---

### Edge Cases

- Lançamento de páginas no dia seguinte ao fechamento, dentro da graça de 24 h (deve contar no período que fechou).
- Virada de fuso/DST: períodos usam `CF_TIMEZONE`; o dia/período não pode "pular" ou duplicar horas.
- Meta semanal com início na segunda em um mês cuja última semana cruza dois meses.
- Livro sem total de páginas definido (não pode ser base para meta de páginas até ser informado).
- Registrar mais páginas que o total do livro (deve ser bloqueado ou exigir confirmar conclusão).
- Dois dispositivos editando o mesmo lançamento/período offline (conflito LWW sinalizado).
- Meta batida e depois um lançamento do período é excluído, derrubando abaixo do alvo (reavaliação; período já fechado é imutável).
- Catálogo externo retorna metadados divergentes (capa/páginas) do que já existe no acervo.
- Livro sem capa (manual ou catálogo sem imagem) — exibir placeholder, nunca "buraco" no grid.
- URL de capa quebrada/lenta ou domínio externo indisponível — não bloquear a estante; cair no placeholder.
- Capa ainda não baixada em cache e dispositivo offline — mostrar placeholder e carregar quando reconectar.
- Espaço com um único membro (uso individual) — feed vazio, desafios desabilitados.
- Conquista gerada offline e sincronizada depois, sem duplicar o card.
- Mudança do dia de início da meta enquanto há período aberto (a nova regra vale só do próximo período; o aberto fecha com as fronteiras antigas).
- Reabertura de período já fechado que já tinha conquista/card gerado (card anterior é marcado como desatualizado e o streak é recalculado).
- Livro marcado `abandonado` depois de ter contado numa meta de livros ainda aberta (progresso do período é recalculado; período fechado não muda).
- Catálogo externo retorna acima de 10 resultados ou o cache de capas excede o teto (limite aplicado e descarte LRU, sem bloquear a estante).

## Requirements *(mandatory)*

### Functional Requirements

**Autenticação, espaço e segurança**

- **FR-001**: O sistema DEVE autenticar por Magic Link de uso único, com expiração de 10–15 min, invalidado no primeiro uso.
- **FR-002**: O sistema DEVE oferecer 2FA por TOTP (step-up) e exigi-lo em ações sensíveis e dispositivos desconhecidos.
- **FR-003**: O sistema DEVE permitir criar um `space`, convidar membros por token seguro e atribuir papéis (`owner | partner | viewer`).
- **FR-004**: O sistema DEVE isolar todos os dados por `space_id`, negando e auditando qualquer acesso cross-space no backend.
- **FR-005**: O sistema DEVE aplicar todas as regras de negócio, RBAC e validação no backend (PocketBase), nunca apenas no cliente.
- **FR-006**: O sistema DEVE usar soft delete (`deleted_at`) e registrar ações sensíveis em `AuditLog`.
- **FR-007**: O sistema DEVE manter sessão e sync funcionando offline, revalidando 2FA quando voltar a exigir online.

**Acervo e progresso**

- **FR-008**: O sistema DEVE permitir cadastrar livros manualmente e por busca (título/ISBN) em catálogo externo gratuito.
- **FR-009**: O sistema DEVE permitir status de leitura `quero ler | lendo | lido | abandonado` por usuário dentro do espaço.
- **FR-010**: O sistema DEVE registrar páginas lidas por data e livro, calculando página atual, páginas restantes e % concluído.
- **FR-011**: O sistema DEVE marcar automaticamente como `lido` ao atingir o total de páginas (ou exigir confirmação), registrando a data.
- **FR-012**: O sistema DEVE permitir avaliação, notas/resenhas, tags/gêneros e favoritos por livro do usuário.
- **FR-013**: O sistema DEVE tolerar indisponibilidade do catálogo externo sem bloquear o cadastro manual nem a leitura offline.
- **FR-032**: O sistema DEVE exibir o acervo como **estante visual em grid com capas dos livros**, com filtro por status e busca por título/autor, mostrando progresso e avaliação.
- **FR-033**: O sistema DEVE exibir uma **capa-placeholder** determinística (a partir do título/autor) quando o livro não tiver capa, mantendo o layout do grid consistente.
- **FR-034**: O sistema DEVE **cachear as capas localmente** para exibição offline e degradar para o placeholder quando a imagem não estiver disponível.

**Metas**

- **FR-014**: O sistema DEVE permitir metas por período `dia | semana | mês`, com métrica `páginas | livros`, alvo configurável, **dia de início** configurável e **janela de graça** de fechamento (default 24 h).
- **FR-015**: O sistema DEVE tratar o período como orçamento acumulado, permitindo compensar dias não lidos em outros dias do mesmo período.
- **FR-016**: O sistema DEVE calcular períodos e fechamentos no fuso `CF_TIMEZONE` (default `America/Sao_Paulo`).
- **FR-017**: O sistema DEVE fechar cada período como `batida | não batida` ao fim da graça, de forma imutável; a reabertura DEVE ser restrita a membros com papel de edição (`owner | partner`), registrada em `AuditLog` (com `reopened_at` e `before/after`), retornar o período ao estado `aberto` respeitando a graça, e disparar recálculo de progresso, `status`, streak e conquistas afetadas.
- **FR-018**: O sistema DEVE recalcular metas afetadas quando lançamentos forem criados, editados ou excluídos (respeitando períodos já fechados).
- **FR-019**: O sistema DEVE suportar metas simultâneas de páginas e de livros.
- **FR-035**: O sistema DEVE aplicar alterações no **dia de início** de uma meta apenas a partir do **próximo período**; o período aberto e os períodos fechados mantêm as fronteiras originais, sem reprocessamento retroativo de lançamentos.
- **FR-036**: O sistema DEVE contabilizar metas de **livros** apenas para livros com status `lido` (pela data de conclusão); ao marcar um livro como `abandonado`, ele DEVE ser removido do progresso do período **aberto** (recalculado), permanecendo imutáveis os períodos já fechados.
- **FR-037**: O sistema DEVE limitar o uso do catálogo externo: persistir no espaço apenas metadados adotados no acervo, manter cache temporário de buscas/sugestões com **TTL de 30 dias**, retornar **no máximo 10 resultados por consulta**, cachear capas com **teto de ~100 capas/50 MB (descarte LRU)** e usar timeout/backoff com degradação para o acervo interno.

**Conquistas, dashboards e social**

- **FR-020**: O sistema DEVE gerar um card compartilhável (imagem) determinístico a partir do estado do período, para `batida` e `não batida`.
- **FR-021**: O sistema DEVE gerar o card offline e garantir o mesmo resultado que online para o mesmo estado.
- **FR-022**: O sistema DEVE exibir dashboards com progresso da meta, páginas restantes, dias restantes, páginas por dia e streak de períodos batidos.
- **FR-023**: O sistema DEVE exibir um feed do espaço com eventos relevantes (livro concluído, meta batida, avanço relevante), com curtidas e comentários.
- **FR-024**: O sistema DEVE permitir que membros do espaço vejam o progresso e as metas uns dos outros; `viewer` apenas lê.
- **FR-025**: O sistema DEVE gerar recomendações a partir do acervo (gêneros/tags/notas/favoritos) e, quando disponível, complementar com catálogo externo gratuito, nunca repetindo lidos/abandonados.
- **FR-026**: O sistema DEVE permitir desafios conjuntos do espaço com progresso somado e fechamento pelas mesmas regras de meta.

**Offline, sync e notificações**

- **FR-027**: O sistema DEVE gravar toda escrita primeiro localmente (Dexie) e enfileirar na Outbox antes de qualquer rede.
- **FR-028**: O sistema DEVE sincronizar de forma idempotente por `sync_id`, com pull por delta (cursor) incluindo soft deletes e resolução de conflito LWW sinalizada (`conflict=true`).
- **FR-029**: O sistema DEVE enviar notificações Web Push (VAPID) opt-in para lembretes de meta e fechamento de período.
- **FR-030**: O sistema DEVE expor, ao usuário, estado de sync (pendentes, último erro, tentativas) e permitir sincronizar manualmente.

**Acesso (teste)**

- **FR-031**: O sistema DEVE ser publicável via Cloudflare Tunnel (quick tunnel) para teste, roteando `/api` e `/_` para o PocketBase e o restante para o PWA.

### Key Entities *(include if feature involves data)*

- **users**: pessoa; e-mail (auth), nome, avatar, `active`, flags de 2FA, último login.
- **spaces**: espaço do casal/individual; nome, `created_by`, `settings`, `sync_id`, `deleted_at`.
- **space_members**: vínculo membro↔espaço; `space`, `user`, `role`, `invite_status`, `joined_at`.
- **invites**: convite; `space`, `role`, `email_invited`, `token_hash`, `expires_at`, `used_at`.
- **books**: obra; título, autor(es), ISBN, capa, `total_pages`, gêneros/tags, fonte externa.
- **user_books**: acervo pessoal; `user`, `book`, `status`, `current_page`, `rating`, `notes`, `favorite`, `started_at`, `finished_at`.
- **reading_logs**: lançamento de páginas; `user`, `book`, `date`, `pages`, `sync_id`, `deleted_at`.
- **goals**: meta; `space`/`user`, métrica (`páginas | livros`), período (`dia | semana | mês`), alvo, **dia de início**, **graça (h)**, ativa (mudança do dia de início vale a partir do próximo período).
- **goal_periods**: instância de período; `goal`, `start`, `end`, `target`, `progress`, `status` (`aberto | batida | não batida`), `closed_at`, `grace_until`, `reopened_at`.
- **achievements**: conquista; `goal_period`, `user`, `kind`, `payload`, `card_ref`.
- **posts**: feed do espaço; `space`, `actor`, `kind`, `ref` (livro/meta), `summary`, timestamps.
- **reactions** / **comments**: interações em `posts`; autor, tipo, conteúdo, timestamps.
- **challenges**: desafio conjunto; `space`, métrica, alvo, período, participantes.
- **recommendations**: sugestão; `user`, `book_ref`, `reason`, `source` (interno/externo), `dismissed` (cache temporária com TTL de 30 dias; máx. 10 resultados por consulta).
- **audit_logs**: trilha de ações sensíveis; ator, ação, antes/depois, timestamp.
- **notification_preferences**: preferências de push por usuário.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Um novo usuário conclui login (Magic Link), ativa 2FA e cria o espaço em menos de 3 minutos.
- **SC-002**: Registrar um livro e o progresso de páginas leva menos de 30 segundos por lançamento no celular.
- **SC-003**: 100% dos períodos calculados batem com um conjunto de lançamentos conhecido, incluindo compensação, início de semana configurável, mudança do dia de início no meio do período (efeito a partir do próximo período) e graça de 24 h.
- **SC-004**: Operações de leitura/lançamento funcionam offline e sincronizam sem perda nem duplicação em 100% dos casos testados.
- **SC-005**: O card de conquista é gerado em menos de 2 segundos e é idêntico entre online e offline para o mesmo estado.
- **SC-006**: Nenhum dado cruza espaços diferentes em qualquer teste de isolamento.
- **SC-007**: Recomendações exibem motivo e não repetem livros já lidos/abandonados em 100% das sugestões.
- **SC-008**: A estante exibe capa ou placeholder para 100% dos livros, inclusive offline, sem buracos ou imagens quebradas no grid.
- **SC-009**: Os limites do catálogo externo são respeitados em 100% das consultas (≤ 10 resultados por consulta, cache com TTL de 30 dias, cache de capas dentro do teto com descarte LRU) e a indisponibilidade externa nunca bloqueia cadastro, recomendações internas ou estante.

## Assumptions

- Uso pessoal e familiar (o casal): poucos usuários por espaço; sem requisitos de escala massiva.
- O acesso em teste é via Cloudflare quick tunnel (URL efêmera) nos moldes do `controle-financeiro`; produção/domínio próprio fica para depois.
- Catálogos externos serão **gratuitos** (ex.: Open Library) e sem dependência de chave paga; falhas degradam graciosamente para o acervo interno.
- Fuso de negócio padrão `America/Sao_Paulo`, configurável por `CF_TIMEZONE`.
- Sem SMTP configurado, o Magic Link aparece no log do PocketBase (modo dev).
- Metas por `livros` contam apenas livros com status `lido` (data de conclusão); marcar como `abandonado` remove o livro do período aberto. Metas por `páginas` usam os lançamentos de páginas.
- Desafios conjuntos são somas do progresso dos membros no mesmo espaço; uso individual os desabilita.
