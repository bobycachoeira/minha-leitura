/// <reference path="../pb_data/types.d.ts" />
/** Fase 4 (fundação) — badges de marcos conquistados por usuário. */
migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    const spaces = app.findCollectionByNameOrId('spaces')

    const milestones = new Collection({
      type: 'base',
      name: 'milestones',
      fields: [
        { name: 'space', type: 'relation', required: true, maxSelect: 1, collectionId: spaces.id, cascadeDelete: true },
        { name: 'owner', type: 'relation', required: true, maxSelect: 1, collectionId: users.id, cascadeDelete: true },
        { name: 'key', type: 'text', required: true, max: 60 },
        { name: 'payload', type: 'json', maxSize: 200000 },
        { name: 'unlocked_at', type: 'date' },
        { name: 'sync_id', type: 'text', required: true },
        { name: 'updated_by', type: 'relation', maxSelect: 1, collectionId: users.id },
        { name: 'deleted_at', type: 'date' },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_milestones_key ON milestones (space, owner, key)'],
    })
    const AUTH = '@request.auth.id != ""'
    const SPACE = AUTH + ' && space.space_members_via_space.user ?= @request.auth.id'
    const EDIT_ROLE = '@request.auth.id != "" && space.space_members_via_space.role ?!= "viewer"'
    milestones.listRule = SPACE
    milestones.viewRule = SPACE
    milestones.createRule = EDIT_ROLE
    milestones.updateRule = EDIT_ROLE
    milestones.deleteRule = EDIT_ROLE
    milestones.fields.add(new AutodateField({ name: 'created', system: true, onCreate: true }))
    milestones.fields.add(new AutodateField({ name: 'updated', system: true, onCreate: true, onUpdate: true }))
    app.save(milestones)
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('milestones'))
    } catch (e) {
      /* ignore */
    }
  },
)
