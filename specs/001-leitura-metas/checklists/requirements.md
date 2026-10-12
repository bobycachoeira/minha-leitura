# Requirements Quality Checklist — Minha Leitura

**Purpose**: validar a qualidade, clareza e consistência dos requisitos antes da
implementação (foco em segurança, metas offline/sync e conteúdo gerado).

## Completude

- [x] CHK001 Todas as user stories têm prioridade (P1–P3), teste independente e cenários Given/When/Then.
- [ ] CHK002 Cada FR da spec está coberto por ao menos uma tarefa no `tasks.md`.
- [ ] CHK003 As entidades do `data-model.md` cobrem todos os FRs (acervo, metas, feed, recomendações, desafios).

## Clareza

- [x] CHK004 O modelo de compensação de páginas está inequívoco (orçamento acumulado, sem cobrança diária).
- [x] CHK005 O dia de início da semana e o efeito em períodos que cruzam meses estão definidos.
- [x] CHK006 A janela de graça e a regra de imutabilidade do fechamento estão explícitas.
- [x] CHK007 Está claro o que o card compartilhável exibe e o que nunca expõe.

## Consistência

- [x] CHK008 `week_start`/`grace_hours`/`period` são consistentes entre spec, data-model e contratos.
- [x] CHK009 O isolamento por `space` aparece em todos os recursos multi-tenant (collections, regras, contratos).
- [x] CHK010 Metas de `páginas` derivam de `reading_logs` e metas de `livros` da conclusão do livro, sem ambiguidade.

## Mensurabilidade

- [x] CHK011 Os critérios de sucesso (SC-001..SC-007) são verificáveis objetivamente.
- [x] CHK012 Há teste automatizado previsto para cada regra de negócio dos Princípios III/IV.

## Cobertura de cenários & borda

- [x] CHK013 Casos de borda de fuso/DST e virada de mês/período estão cobertos.
- [x] CHK014 Catálogo externo indisponível não bloqueia cadastro nem recomendações (degradação).
- [x] CHK015 Conflitos offline (LWW + `conflict=true`) e reenvio/idempotência estão cobertos.

## Segurança (Princípio I)

- [ ] CHK016 Magic Link de uso único/expiração; 2FA step-up em ações sensíveis; rate limit e bloqueio.
- [x] CHK017 Soft delete + auditoria para ações sensíveis (reabrir período, apagar histórico, convites).
- [x] CHK018 Nenhuma regra de negócio ou autorização vive apenas no frontend.

## Offline/Sync (Princípio II)

- [x] CHK019 Toda escrita vai primeiro para Dexie/Outbox; pull por delta inclui soft deletes.
- [x] CHK020 O cálculo de meta offline produz o mesmo resultado que online para o mesmo estado.
