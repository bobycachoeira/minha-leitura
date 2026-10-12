/// <reference path="../pb_data/types.d.ts" />
/**
 * T035 — sync infrastructure: sync_events, audit_logs and the change_log table.
 */
migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    const spaces = app.findCollectionByNameOrId('spaces')

    const syncEvents = new Collection({
      type: 'base',
      name: 'sync_events',
      fields: [
        { name: 'space', type: 'relation', required: true, maxSelect: 1, collectionId: spaces.id, cascadeDelete: true },
        { name: 'entity', type: 'text', required: true },
        { name: 'sync_id', type: 'text', required: true },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_sync_event ON sync_events (space, entity, sync_id)'],
    })
    app.save(syncEvents)

    const auditLogs = new Collection({
      type: 'base',
      name: 'audit_logs',
      fields: [
        { name: 'space', type: 'relation', required: true, maxSelect: 1, collectionId: spaces.id, cascadeDelete: true },
        { name: 'actor', type: 'relation', required: true, maxSelect: 1, collectionId: users.id },
        { name: 'action', type: 'text', required: true },
        { name: 'entity', type: 'text' },
        { name: 'entity_id', type: 'text' },
        { name: 'before', type: 'json', maxSize: 200000 },
        { name: 'after', type: 'json', maxSize: 200000 },
      ],
      indexes: ['CREATE INDEX idx_audit_space ON audit_logs (space)'],
    })
    app.save(auditLogs)

    app
      .db()
      .newQuery(
        `CREATE TABLE IF NOT EXISTS change_log (
          seq INTEGER PRIMARY KEY AUTOINCREMENT,
          space TEXT NOT NULL,
          entity TEXT NOT NULL,
          entity_id TEXT NOT NULL,
          op TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )`,
      )
      .execute()
    app.db().newQuery('CREATE INDEX IF NOT EXISTS idx_change_log_seq ON change_log (seq)').execute()
    app.db().newQuery('CREATE INDEX IF NOT EXISTS idx_change_log_space ON change_log (space, seq)').execute()
  },
  (app) => {
    app.delete(app.findCollectionByNameOrId('audit_logs'))
    app.delete(app.findCollectionByNameOrId('sync_events'))
    app.db().newQuery('DROP TABLE IF EXISTS change_log').execute()
  },
)
