/// <reference path="../pb_data/types.d.ts" />
/** Adds the `test` notification kind (used by the "send test" button). */
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
        values: ['like', 'comment', 'follow', 'post', 'period', 'test'],
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
          values: ['like', 'comment', 'follow', 'post', 'period'],
        }),
      )
      app.save(notes)
    } catch (e) {
      /* ignore */
    }
  },
)
