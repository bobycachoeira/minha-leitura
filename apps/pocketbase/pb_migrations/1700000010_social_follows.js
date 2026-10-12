/// <reference path="../pb_data/types.d.ts" />
/**
 * Social opt-in: posts get a `visibility` (space|public) and a `follows`
 * collection enables viewing another user's PUBLIC posts only.
 *
 * Privacy: reading data (books, logs, goals) stays space-isolated. Only posts
 * explicitly marked `public` are readable cross-user.
 */
migrate(
  (app) => {
    const posts = app.findCollectionByNameOrId('posts')
    if (!posts.fields.getByName('visibility')) {
      posts.fields.add(
        new Field({ name: 'visibility', type: 'select', maxSelect: 1, values: ['space', 'public'] }),
      )
    }
    app.save(posts)

    const users = app.findCollectionByNameOrId('users')
    const follows = new Collection({
      type: 'base',
      name: 'follows',
      fields: [
        { name: 'follower', type: 'relation', required: true, maxSelect: 1, collectionId: users.id, cascadeDelete: true },
        { name: 'following', type: 'relation', required: true, maxSelect: 1, collectionId: users.id, cascadeDelete: true },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_follows_pair ON follows (follower, following)'],
    })
    follows.fields.add(new AutodateField({ name: 'created', system: true, onCreate: true }))
    follows.fields.add(new AutodateField({ name: 'updated', system: true, onCreate: true, onUpdate: true }))
    app.save(follows)
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('follows'))
    } catch (e) {
      // ignore
    }
  },
)
