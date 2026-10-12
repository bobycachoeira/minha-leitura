/// <reference path="../pb_data/types.d.ts" />
/**
 * Trusted devices for step-up 2FA (US1).
 */
migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    users.fields.add(new Field({ name: 'trusted_devices', type: 'json', maxSize: 200000 }))
    app.save(users)
  },
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    users.fields.removeByName('trusted_devices')
    app.save(users)
  },
)
