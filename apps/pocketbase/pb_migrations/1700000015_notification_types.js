/// <reference path="../pb_data/types.d.ts" />
/**
 * Per-type notification preferences (likes, comments, follows, feed) and the
 * fields needed to track push delivery and new notification kinds.
 */
migrate(
  (app) => {
    const prefs = app.findCollectionByNameOrId('notification_preferences')
    for (const name of ['likes', 'comments', 'follows']) {
      if (!prefs.fields.getByName(name)) {
        prefs.fields.add(new Field({ name: name, type: 'bool' }))
      }
    }
    app.save(prefs)

    const notes = app.findCollectionByNameOrId('notifications')
    if (!notes.fields.getByName('pushed_at')) {
      notes.fields.add(new Field({ name: 'pushed_at', type: 'date' }))
    }
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
          values: ['like', 'comment', 'follow'],
        }),
      )
      notes.fields.removeByName('pushed_at')
      app.save(notes)
      const prefs = app.findCollectionByNameOrId('notification_preferences')
      for (const name of ['likes', 'comments', 'follows']) {
        prefs.fields.removeByName(name)
      }
      app.save(prefs)
    } catch (e) {
      /* ignore */
    }
  },
)
