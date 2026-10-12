/// <reference path="../pb_data/types.d.ts" />
/** Notifications for reactions/comments/follows on a user's content. */
migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    const posts = app.findCollectionByNameOrId('posts')
    const comments = app.findCollectionByNameOrId('comments')

    const notifications = new Collection({
      type: 'base',
      name: 'notifications',
      fields: [
        { name: 'user', type: 'relation', required: true, maxSelect: 1, collectionId: users.id, cascadeDelete: true },
        { name: 'actor', type: 'relation', required: true, maxSelect: 1, collectionId: users.id, cascadeDelete: true },
        { name: 'kind', type: 'select', required: true, maxSelect: 1, values: ['like', 'comment', 'follow'] },
        { name: 'post', type: 'relation', maxSelect: 1, collectionId: posts.id, cascadeDelete: true },
        { name: 'comment', type: 'relation', maxSelect: 1, collectionId: comments.id, cascadeDelete: true },
        { name: 'body', type: 'text', max: 300 },
        { name: 'is_read', type: 'bool' },
      ],
      indexes: ['CREATE INDEX idx_notifications_user_read ON notifications (user, is_read)'],
    })
    notifications.fields.add(new AutodateField({ name: 'created', system: true, onCreate: true }))
    notifications.fields.add(new AutodateField({ name: 'updated', system: true, onCreate: true, onUpdate: true }))
    app.save(notifications)
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('notifications'))
    } catch (e) {
      // ignore
    }
  },
)
