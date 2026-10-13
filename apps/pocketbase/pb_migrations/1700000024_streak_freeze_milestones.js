/// <reference path="../pb_data/types.d.ts" />
/** Fase 4 — status "congelado" (perdão de streak) e tipo de notificação "milestone". */
migrate(
  (app) => {
    const periods = app.findCollectionByNameOrId('goal_periods')
    periods.fields.removeByName('status')
    periods.fields.add(
      new Field({
        name: 'status',
        type: 'select',
        required: true,
        maxSelect: 1,
        values: ['aberto', 'batida', 'nao_batida', 'congelado'],
      }),
    )
    app.save(periods)

    const notes = app.findCollectionByNameOrId('notifications')
    notes.fields.removeByName('kind')
    notes.fields.add(
      new Field({
        name: 'kind',
        type: 'select',
        required: true,
        maxSelect: 1,
        values: ['like', 'comment', 'follow', 'post', 'period', 'test', 'partner', 'near_goal', 'retrospective', 'milestone'],
      }),
    )
    app.save(notes)
  },
  (app) => {
    try {
      const periods = app.findCollectionByNameOrId('goal_periods')
      periods.fields.removeByName('status')
      periods.fields.add(
        new Field({
          name: 'status',
          type: 'select',
          required: true,
          maxSelect: 1,
          values: ['aberto', 'batida', 'nao_batida'],
        }),
      )
      app.save(periods)
    } catch (e) {
      /* ignore */
    }
  },
)
