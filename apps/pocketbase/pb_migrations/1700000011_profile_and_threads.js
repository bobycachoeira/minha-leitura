/// <reference path="../pb_data/types.d.ts" />
/**
 * Profile (bio + avatar as a small data URL, offline-friendly) and threaded
 * comments (`parent`).
 */
migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    if (!users.fields.getByName('bio')) {
      users.fields.add(new Field({ name: 'bio', type: 'text', max: 280 }))
    }
    if (!users.fields.getByName('avatar_data')) {
      users.fields.add(new Field({ name: 'avatar_data', type: 'text', max: 400000 }))
    }
    app.save(users)

    const comments = app.findCollectionByNameOrId('comments')
    if (!comments.fields.getByName('parent')) {
      comments.fields.add(
        new Field({ name: 'parent', type: 'relation', maxSelect: 1, collectionId: comments.id }),
      )
    }
    app.save(comments)
  },
  () => {
    /* no-op (keep data) */
  },
)
