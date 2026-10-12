/// <reference path="../pb_data/types.d.ts" />
/**
 * T034 — social and content collections.
 */
migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    const spaces = app.findCollectionByNameOrId('spaces')
    const books = app.findCollectionByNameOrId('books')
    const achievements = app.findCollectionByNameOrId('achievements')

    const posts = new Collection({
      type: 'base',
      name: 'posts',
      fields: [
        { name: 'space', type: 'relation', required: true, maxSelect: 1, collectionId: spaces.id, cascadeDelete: true },
        { name: 'actor', type: 'relation', required: true, maxSelect: 1, collectionId: users.id, cascadeDelete: true },
        { name: 'kind', type: 'select', required: true, maxSelect: 1, values: ['livro_concluido', 'meta_batida', 'avanco', 'desafio', 'manual'] },
        { name: 'ref_book', type: 'relation', maxSelect: 1, collectionId: books.id },
        { name: 'ref_achievement', type: 'relation', maxSelect: 1, collectionId: achievements.id },
        { name: 'summary', type: 'text', max: 1000 },
        { name: 'synced', type: 'bool' },
        { name: 'sync_id', type: 'text', required: true },
        { name: 'updated_by', type: 'relation', maxSelect: 1, collectionId: users.id },
        { name: 'deleted_at', type: 'date' },
      ],
      indexes: ['CREATE INDEX idx_posts_space ON posts (space)'],
    })
    app.save(posts)

    const reactions = new Collection({
      type: 'base',
      name: 'reactions',
      fields: [
        { name: 'space', type: 'relation', required: true, maxSelect: 1, collectionId: spaces.id, cascadeDelete: true },
        { name: 'post', type: 'relation', required: true, maxSelect: 1, collectionId: posts.id, cascadeDelete: true },
        { name: 'user', type: 'relation', required: true, maxSelect: 1, collectionId: users.id, cascadeDelete: true },
        { name: 'kind', type: 'select', required: true, maxSelect: 1, values: ['curtir', 'aplauso', 'forca'] },
        { name: 'sync_id', type: 'text', required: true },
        { name: 'deleted_at', type: 'date' },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_reaction ON reactions (post, user, kind)'],
    })
    app.save(reactions)

    const comments = new Collection({
      type: 'base',
      name: 'comments',
      fields: [
        { name: 'space', type: 'relation', required: true, maxSelect: 1, collectionId: spaces.id, cascadeDelete: true },
        { name: 'post', type: 'relation', required: true, maxSelect: 1, collectionId: posts.id, cascadeDelete: true },
        { name: 'author', type: 'relation', required: true, maxSelect: 1, collectionId: users.id, cascadeDelete: true },
        { name: 'body', type: 'text', required: true, min: 1, max: 1000 },
        { name: 'sync_id', type: 'text', required: true },
        { name: 'updated_by', type: 'relation', maxSelect: 1, collectionId: users.id },
        { name: 'deleted_at', type: 'date' },
      ],
      indexes: ['CREATE INDEX idx_comments_post ON comments (post)'],
    })
    app.save(comments)

    const challenges = new Collection({
      type: 'base',
      name: 'challenges',
      fields: [
        { name: 'space', type: 'relation', required: true, maxSelect: 1, collectionId: spaces.id, cascadeDelete: true },
        { name: 'title', type: 'text', required: true, max: 200 },
        { name: 'metric', type: 'select', required: true, maxSelect: 1, values: ['paginas', 'livros'] },
        { name: 'period', type: 'select', required: true, maxSelect: 1, values: ['semana', 'mes'] },
        { name: 'target', type: 'number', required: true, min: 1, onlyInt: true },
        { name: 'start_date', type: 'date', required: true },
        { name: 'end_date', type: 'date', required: true },
        { name: 'grace_hours', type: 'number', min: 0, onlyInt: true },
        { name: 'status', type: 'select', required: true, maxSelect: 1, values: ['aberto', 'batida', 'nao_batida'] },
        { name: 'created_by', type: 'relation', maxSelect: 1, collectionId: users.id },
        { name: 'sync_id', type: 'text', required: true },
        { name: 'updated_by', type: 'relation', maxSelect: 1, collectionId: users.id },
        { name: 'deleted_at', type: 'date' },
      ],
      indexes: ['CREATE INDEX idx_challenges_space ON challenges (space)'],
    })
    app.save(challenges)

    const participants = new Collection({
      type: 'base',
      name: 'challenges_participants',
      fields: [
        { name: 'space', type: 'relation', required: true, maxSelect: 1, collectionId: spaces.id, cascadeDelete: true },
        { name: 'challenge', type: 'relation', required: true, maxSelect: 1, collectionId: challenges.id, cascadeDelete: true },
        { name: 'user', type: 'relation', required: true, maxSelect: 1, collectionId: users.id, cascadeDelete: true },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_challenge_user ON challenges_participants (challenge, user)'],
    })
    app.save(participants)

    const recommendations = new Collection({
      type: 'base',
      name: 'recommendations',
      fields: [
        { name: 'space', type: 'relation', required: true, maxSelect: 1, collectionId: spaces.id, cascadeDelete: true },
        { name: 'owner', type: 'relation', required: true, maxSelect: 1, collectionId: users.id, cascadeDelete: true },
        { name: 'external_id', type: 'text' },
        { name: 'title', type: 'text' },
        { name: 'authors', type: 'json', maxSize: 200000 },
        { name: 'cover_url', type: 'url' },
        { name: 'reason', type: 'text' },
        { name: 'source', type: 'select', maxSelect: 1, values: ['interno', 'open_library', 'google_books'] },
        { name: 'score', type: 'number' },
        { name: 'dismissed', type: 'bool' },
        { name: 'added', type: 'bool' },
        { name: 'expires_at', type: 'date' },
      ],
    })
    app.save(recommendations)

    const notifications = new Collection({
      type: 'base',
      name: 'notification_preferences',
      fields: [
        { name: 'space', type: 'relation', required: true, maxSelect: 1, collectionId: spaces.id, cascadeDelete: true },
        { name: 'user', type: 'relation', required: true, maxSelect: 1, collectionId: users.id, cascadeDelete: true },
        { name: 'goal_reminders', type: 'bool' },
        { name: 'period_close_reminders', type: 'bool' },
        { name: 'feed', type: 'bool' },
        { name: 'subscriptions', type: 'json', maxSize: 200000 },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_notif_user ON notification_preferences (space, user)'],
    })
    app.save(notifications)
  },
  (app) => {
    for (const name of [
      'notification_preferences',
      'recommendations',
      'challenges_participants',
      'challenges',
      'comments',
      'reactions',
      'posts',
    ]) {
      app.delete(app.findCollectionByNameOrId(name))
    }
  },
)
