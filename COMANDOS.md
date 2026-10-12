# Comandos SDD (Spec Kit) — Minha Leitura

> Fluxo Spec-Driven Development do projeto. Execute **um comando por mensagem** no chat do
> opencode e revise o resultado antes de seguir.
> A ordem importa: `constitution → specify → (clarify) → plan → tasks →
> (analyze/checklist) → implement → converge`.

## Ordem e repetição

| Comando | Quando | Repete? |
|---|---|---|
| `constitution` | 1x por projeto | Só se mudar princípios |
| `specify` | por feature | 1x |
| `clarify` | opcional (antes do plan) | Pode repetir |
| `plan` | por feature | 1x |
| `tasks` | por feature | 1x |
| `analyze` / `checklist` | opcional (após tasks) | Pode repetir |
| `implement` | por feature | Pode retomar |
| `converge` | após implement | Repetir até "Converged" |

Fluxo mínimo sem opcionais: `constitution → specify → plan → tasks → implement → converge`.

**Status atual**: `constitution`, `specify`, `plan` e `tasks` já foram gerados para a feature
`001-leitura-metas` (pasta `specs/001-leitura-metas/`). O próximo passo é `implement`.

---

## 1) Constituição (uma vez)

```text
/speckit.constitution
```

Já criada em `.specify/memory/constitution.md` (versão 1.0.0). Só reexecute se quiser mudar
princípios.

## 2) Especificação (por feature)

```text
/speckit.specify
```

Já criada em `specs/001-leitura-metas/spec.md`.

## 3) Clarificar (opcional, antes do plan)

```text
/speckit.clarify Foque em lacunas de: cálculo de meta quando o usuário muda o dia de início
no meio de um período; política exata de reabertura de período já fechado; comportamento da
meta de livros quando o livro é abandonado; e limites de dados do catálogo externo. No
máximo 5 perguntas; registre as respostas na spec.
```

## 4) Plano técnico (por feature)

```text
/speckit.plan
```

Já criado em `specs/001-leitura-metas/plan.md` (+ research.md, data-model.md, quickstart.md,
contracts/).

## 5) Tarefas (por feature)

```text
/speckit.tasks
```

Já criado em `specs/001-leitura-metas/tasks.md` (127 tarefas, fases T001–T127).

## 6) Consistência / Qualidade (opcional)

```text
/speckit.analyze
```

```text
/speckit.checklist Qualidade dos requisitos de segurança, metas/graça, offline/sincronização
e estante de capas.
```

## 7) Implementar (por feature, pode retomar)

```text
/speckit.implement Comece pelas Fases 1 e 2 (T001–T058) e depois a US2 (estante com capas).
```

## 8) Convergir (repetir até "Converged")

```text
/speckit.converge
```

---

## Observações

- Não é possível empilhar vários comandos numa mensagem. Existe **encadeamento** por
  *handoffs* (ex.: `tasks` oferece "Analyze"/"Implement") — aceite para avançar sem digitar
  tudo.
- Sintaxe do opencode é com ponto: `/speckit.<nome>` (arquivos em `.opencode/commands/`).
- **Reinicie o opencode** se os comandos `/speckit.*` ainda não aparecerem (eles são
  carregados na inicialização).
- Sempre revise cada artefato gerado (`.specify/` e `specs/001-leitura-metas/`) antes do
  próximo comando.
- Ações extras do Spec Kit: `/speckit.taskstoissues` (abre issues a partir do tasks.md),
  `/speckit.constitution` (emenda de princípios).
