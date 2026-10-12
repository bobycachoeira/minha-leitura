/// <reference path="../pb_data/types.d.ts" />
/**
 * T030 — custom fields on the built-in `users` auth collection.
 */
migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    users.fields.add(new Field({ name: 'name', type: 'text', required: true, max: 80 }))
    users.fields.add(new Field({ name: 'avatar', type: 'file', maxSelect: 1, maxSize: 2097152, mimeTypes: ['image/png', 'image/jpeg', 'image/webp'] }))
    users.fields.add(new Field({ name: 'active', type: 'bool' }))
    users.fields.add(new Field({ name: 'twofa_enabled', type: 'bool' }))
    users.fields.add(new Field({ name: 'twofa_setup_completed', type: 'bool' }))
    users.fields.add(new Field({ name: 'twofa_secret_encrypted', type: 'text' }))
    users.fields.add(new Field({ name: 'recovery_codes_hashed', type: 'json', maxSize: 200000 }))
    users.fields.add(new Field({ name: 'webauthn_credentials', type: 'json', maxSize: 200000 }))
    users.fields.add(new Field({ name: 'last_known_device', type: 'text' }))
    users.fields.add(new Field({ name: 'last_login_at', type: 'date' }))
    app.save(users)
  },
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    for (const name of [
      'name',
      'avatar',
      'active',
      'twofa_enabled',
      'twofa_setup_completed',
      'twofa_secret_encrypted',
      'recovery_codes_hashed',
      'webauthn_credentials',
      'last_known_device',
      'last_login_at',
    ]) {
      users.fields.removeByName(name)
    }
    app.save(users)
  },
)
