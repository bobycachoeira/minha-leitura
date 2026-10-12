/// <reference path="../pb_data/types.d.ts" />
/** Likes on comments. */
migrate(
  (app) => {
    const spaces = app.findCollectionByNameOrId('spaces')
    const users = app.findCollectionByNameOrId('users')
    const comments = app.findCollectionByNameOrId('comments')

    const commentReactions = new Collection({
      type: 'base',
      name: 'comment_reactions',
      fields: [
        { name: 'space', type: 'relation', required: true, maxSelect: 1, collectionId: spaces.id, cascadeDelete: true },
        { name: 'comment', type: 'relation', required: true, maxSelect: 1, collectionId: comments.id, cascadeDelete: true },
        { name: 'user', type: 'relation', required: true, maxSelect: 1, collectionId: users.id, cascadeDelete: true },
        { name: 'kind', type: 'select', maxSelect: 1, values: ['curtir'] },
        { name: 'sync_id', type: 'text' },
        { name: 'deleted_at', type: 'date' },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_comment_reaction ON comment_reactions (comment, user)'],
    })
    commentReactions.fields.add(new AutodateField({ name: 'created', system: true, onCreate: true }))
    commentReactions.fields.add(new AutodateField({ name: 'updated', system: true, onCreate: true, onUpdate: true }))
    app.save(commentReactions)
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('comment_reactions'))
    } catch (e) {
      // ignore
    }
  },
)
