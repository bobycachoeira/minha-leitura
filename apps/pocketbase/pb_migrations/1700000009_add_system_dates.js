/// <reference path="../pb_data/types.d.ts" />
/**
 * Add the system `created`/`updated` autodate fields to every domain collection.
 * Collections created programmatically don't get them automatically, but the
 * app relies on `created`/`updated` for sorting and LWW conflict detection.
 */
migrate(
  (app) => {
    const names = [
      'spaces',
      'space_members',
      'invites',
      'books',
      'user_books',
      'reading_logs',
      'goals',
      'goal_periods',
      'achievements',
      'posts',
      'reactions',
      'comments',
      'challenges',
      'challenges_participants',
      'recommendations',
      'notification_preferences',
      'audit_logs',
      'sync_events',
    ]

    for (const name of names) {
      const collection = app.findCollectionByNameOrId(name)
      if (!collection.fields.getByName('created')) {
        collection.fields.add(new AutodateField({ name: 'created', system: true, onCreate: true }))
      }
      if (!collection.fields.getByName('updated')) {
        collection.fields.add(
          new AutodateField({ name: 'updated', system: true, onCreate: true, onUpdate: true }),
        )
      }
      app.save(collection)
    }
  },
  () => {
    /* no-op */
  },
)
