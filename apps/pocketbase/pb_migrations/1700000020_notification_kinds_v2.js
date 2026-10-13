/// <reference path="../pb_data/types.d.ts" />
/** Fase 1/3/6 — novos tipos de notificação: empurrão do casal, perto da meta e retrospectiva. */
migrate(
  (app) => {
    const notes = app.findCollectionByNameOrId('notifications')
    notes.fields.removeByName('kind')
    notes.fields.add(
      new Field({
        name: 'kind',
        type: 'select',
        required: true,
        maxSelect: 1,
        values: ['like', 'comment', 'follow', 'post', 'period', 'test', 'partner', 'near_goal', 'retrospective'],
      }),
    )
    app.save(notes)
  },
  (app) => {
    try {
      const notes = app.findCollectionByNameOrId('notifications')
      notes.fields.removeByName('kind')
      notes.fields.add(
        new Field({
          name: 'kind',
          type: 'select',
          required: true,
          maxSelect: 1,
          values: ['like', 'comment', 'follow', 'post', 'period', 'test'],
        }),
      )
      app.save(notes)
    } catch (e) {
      /* ignore */
    }
  },
)
