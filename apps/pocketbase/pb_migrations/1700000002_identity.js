/// <reference path="../pb_data/types.d.ts" />
/**
 * T031 — identity collections: spaces, space_members, invites.
 */
migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users')

    const spaces = new Collection({
      type: 'base',
      name: 'spaces',
      fields: [
        { name: 'name', type: 'text', required: true, max: 80 },
        { name: 'settings', type: 'json', maxSize: 200000 },
        { name: 'created_by', type: 'relation', required: true, maxSelect: 1, collectionId: users.id },
        { name: 'sync_id', type: 'text', required: true },
        { name: 'updated_by', type: 'relation', maxSelect: 1, collectionId: users.id },
        { name: 'deleted_at', type: 'date' },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_spaces_sync ON spaces (sync_id)'],
    })
    app.save(spaces)

    const members = new Collection({
      type: 'base',
      name: 'space_members',
      fields: [
        { name: 'space', type: 'relation', required: true, maxSelect: 1, collectionId: spaces.id, cascadeDelete: true },
        { name: 'user', type: 'relation', required: true, maxSelect: 1, collectionId: users.id, cascadeDelete: true },
        { name: 'role', type: 'select', required: true, maxSelect: 1, values: ['owner', 'partner', 'viewer'] },
        { name: 'invite_status', type: 'select', required: true, maxSelect: 1, values: ['pending', 'accepted'] },
        { name: 'joined_at', type: 'date' },
        { name: 'sync_id', type: 'text', required: true },
        { name: 'updated_by', type: 'relation', maxSelect: 1, collectionId: users.id },
        { name: 'deleted_at', type: 'date' },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_members_space_user ON space_members (space, user)'],
    })
    app.save(members)

    const invites = new Collection({
      type: 'base',
      name: 'invites',
      fields: [
        { name: 'space', type: 'relation', required: true, maxSelect: 1, collectionId: spaces.id, cascadeDelete: true },
        { name: 'role', type: 'select', required: true, maxSelect: 1, values: ['partner', 'viewer'] },
        { name: 'email_invited', type: 'email', required: true },
        { name: 'token_hash', type: 'text', required: true },
        { name: 'expires_at', type: 'date', required: true },
        { name: 'used_at', type: 'date' },
        { name: 'used_by', type: 'relation', maxSelect: 1, collectionId: users.id },
        { name: 'single_use', type: 'bool' },
      ],
      indexes: ['CREATE INDEX idx_invites_space ON invites (space)'],
    })
    app.save(invites)
  },
  (app) => {
    app.delete(app.findCollectionByNameOrId('invites'))
    app.delete(app.findCollectionByNameOrId('space_members'))
    app.delete(app.findCollectionByNameOrId('spaces'))
  },
)
