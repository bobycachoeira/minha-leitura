# Requirements Quality Checklist: Minha Leitura

**Purpose**: Validar a qualidade, clareza, consistência e cobertura dos requisitos de
segurança, metas/graça, offline/sincronização e estante de capas antes da implementação.
**Created**: 2026-10-11
**Feature**: [spec.md](../spec.md)

**Note**: Custom checklist gerada por `/speckit.checklist`. Cada item é um "teste unitário"
sobre a QUALIDADE DOS REQUISITOS (completude, clareza, consistência, mensurabilidade,
cobertura), não sobre a implementação.
**Review Ownership**: Artefato revisado por humanos. Marque `[x]` apenas quando o revisor
confirmar que o critério de qualidade do requisito foi satisfeito.
**Marker Semantics**: `[x]` significa requisito revisado e satisfatório em qualidade; NÃO
significa que a implementação foi concluída.

## Segurança e Isolamento

- [ ] CHK001 As regras de isolamento por `space` estão especificadas para todas as entidades multi-tenant? [Completeness, Spec §FR-004]
- [ ] CHK002 Está definido que cada regra de negócio/RBAC é aplicada no backend (não apenas no client)? [Consistency, Spec §FR-005]
- [ ] CHK003 As ações sensíveis que exigem reautenticação 2FA estão enumeradas de forma exaustiva e sem ambiguidade? [Completeness, Spec §FR-002]
- [ ] CHK004 Os requisitos de rate limiting/bloqueio estão especificados como requisito funcional, com limiares quantificados? [Gap, Ambiguity]
- [ ] CHK005 A política de soft delete (`deleted_at`) está definida para todas as entidades e identifica quais aceitam exclusão? [Completeness, Spec §FR-006]
- [ ] CHK006 Está especificado o conteúdo mínimo de `AuditLog` (quem/quando/antes/depois) por ação sensível? [Clarity, Spec §FR-006]
- [ ] CHK007 A expiração e o uso único do Magic Link estão quantificados de forma verificável? [Measurability, Spec §FR-001]
- [ ] CHK008 Está definida a política de reabertura de período (quem, prazo, efeitos) sem ambiguidade? [Clarity, Spec §FR-017]
- [ ] CHK009 A matriz de permissões por papel (`owner|partner|viewer`) está consistente entre spec, data-model e contratos? [Consistency, data-model §space_members]
- [ ] CHK010 Os campos sensíveis (segredo 2FA, recovery codes) têm requisito explícito de ocultação na API? [Completeness, data-model §users]
- [ ] CHK011 A resposta a falha de autenticação (401 / step-up expirado) está definida de forma consistente entre client e backend? [Clarity, Spec §FR-007]

## Metas e Graça

- [ ] CHK012 O modelo de compensação (orçamento acumulado, sem cobrança diária) está inequívoco? [Clarity, Spec §FR-015]
- [ ] CHK013 Os limites de período (início/fim, dia de início configurável) estão definidos com fuso explícito? [Clarity, Spec §FR-014, §FR-016]
- [ ] CHK014 Está especificado o efeito de alterar o dia de início enquanto há período aberto? [Clarity, Spec §FR-035]
- [ ] CHK015 A janela de graça está quantificada (valor default e unidade) e seu cálculo definido? [Measurability, Spec §FR-014, §FR-017]
- [ ] CHK016 A imutabilidade do fechamento e as condições de reabertura estão consistentes entre spec e data-model? [Consistency, Spec §FR-017]
- [ ] CHK017 Está definido o comportamento da meta de livros quando o livro é marcado `abandonado`? [Clarity, Spec §FR-036]
- [ ] CHK018 A interação entre metas simultâneas de páginas e de livros está definida sem ambiguidade? [Completeness, Spec §FR-019]
- [ ] CHK019 Estão definidos os efeitos da reabertura sobre streak e conquistas (card desatualizado)? [Coverage, Spec §FR-017]
- [ ] CHK020 O termo canônico de status de período (`batida`/`nao_batida`) está consistente entre spec, data-model e contratos? [Consistency, Ambiguity]
- [ ] CHK021 Estão cobertos virada de mês e DST sem pular nem duplicar horas? [Coverage, Edge Case, Spec Edge Cases]
- [ ] CHK022 Está definido como um lançamento dentro da graça ou excluído após o fechamento é tratado (atribuição e reavaliação)? [Edge Case, Spec §FR-017]
- [ ] CHK023 Os desafios conjuntos usam as mesmas regras de graça/imutabilidade das metas? [Consistency, Spec §FR-026]

## Offline e Sincronização

- [ ] CHK024 Está definido que toda escrita vai primeiro para Dexie/Outbox antes de qualquer rede? [Completeness, Spec §FR-027]
- [ ] CHK025 A idempotência por `sync_id` está especificada com a chave de dedup exata? [Clarity, Spec §FR-028]
- [ ] CHK026 O pull por delta (cursor) e a inclusão de soft deletes estão definidos? [Completeness, Spec §FR-028]
- [ ] CHK027 A regra de conflito (LWW por `updated_at` do servidor, empate e sinalização `conflict=true`) está sem ambiguidade? [Clarity, Spec §FR-028]
- [ ] CHK028 O comportamento da Outbox (FIFO, retry, descarte de órfãos) está especificado? [Coverage, Gap, Constitution §II]
- [ ] CHK029 Estão definidas exigências de observabilidade do sync (pendentes, último erro, tentativas)? [Completeness, Spec §FR-030]
- [ ] CHK030 Os requisitos cobrem casos de borda de conflito (create vs delete, delete vs update, reenvio)? [Coverage, Edge Case, Constitution §IV]
- [ ] CHK031 Está definido o comportamento offline→online para sessão e revalidação de 2FA? [Clarity, Ambiguity, Spec §FR-007]
- [ ] CHK032 O cálculo de meta offline está especificado como idêntico ao online para o mesmo estado? [Measurability, Spec §FR-021, Constitution §III]
- [ ] CHK033 A atualização do PWA está especificada sem interromper sincronizações em andamento e sob versionamento claro? [Coverage, Constitution §VIII]

## Estante de Capas

- [ ] CHK034 O layout da estante (grid responsivo, capa por livro, filtro por status e busca) está especificado de forma verificável? [Clarity, Spec §FR-032]
- [ ] CHK035 A regra de placeholder para livro sem capa está definida como determinística? [Clarity, Spec §FR-033]
- [ ] CHK036 Estão definidos os estados de renderização da capa (carregando, quebrada, offline)? [Coverage, Edge Case, Spec Edge Cases]
- [ ] CHK037 O cache local de capas tem requisitos de limites (teto/LRU) e de persistência offline? [Completeness, Spec §FR-034, §FR-037]
- [ ] CHK038 Está definido que blobs de capa NÃO trafegam na sincronização? [Consistency, data-model §books]
- [ ] CHK039 A garantia de "capa ou placeholder para 100% dos livros, inclusive offline" é objetivamente mensurável? [Measurability, Spec §SC-008]

## Lacunas e Conflitos Cruzados (do /speckit.analyze)

- [ ] CHK040 O caminho da busca no catálogo (client-direto vs `/api/catalog/search`) está definido sem conflito entre spec, contrato e tarefas? [Conflict, Spec §FR-008, contracts/reading-api.yaml]
- [ ] CHK041 A persistência das decisões do usuário em recomendações (`dismissed`/`added`) está especificada fora do cache efêmero? [Gap, data-model §recommendations]
- [ ] CHK042 Os limites do catálogo externo (≤10 resultados, TTL 30 dias, teto de capas) estão consistentes entre spec, data-model e contrato? [Consistency, Spec §FR-037]
- [ ] CHK043 O mapeamento de nomes de campo entre DB (snake_case) e API (camelCase) está documentado? [Consistency, Gap, contracts/reading-api.yaml]
- [ ] CHK044 A política de marcar `lido` automaticamente vs exigir confirmação está resolvida em uma única alternativa? [Ambiguity, Spec §FR-011]

## Notes

- Marque `[x]` somente após revisão confirmar que o critério de qualidade do requisito foi satisfeito
- Mantenha `[ ]` para itens que ainda exigem esclarecimento, correção ou avaliação do revisor
- `/speckit.implement` lê o estado dos checkboxes como gate e NÃO deve alterar os marcadores
- `checklists/requirements.md` tem ciclo de vida próprio mantido por `/speckit.specify` e `/speckit.clarify`
- Itens com `[Gap]`/`[Ambiguity]`/`[Conflict]` apontam requisitos ausentes ou ambíguos a resolver
- Foco: segurança, metas/graça, offline/sincronização e estante de capas; profundidade: Standard
