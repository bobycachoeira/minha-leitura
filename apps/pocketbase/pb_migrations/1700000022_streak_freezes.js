/// <reference path="../pb_data/types.d.ts" />
/** Fase 4 (fundação) — "congelamentos" de streak aplicados a um dia perdido. */
migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    const spaces = app.findCollectionByNameOrId('spaces')

    const freezes = new Collection({
      type: 'base',
      name: 'streak_freezes',
      fields: [
        { name: 'space', type: 'relation', required: true, maxSelect: 1, collectionId: spaces.id, cascadeDelete: true },
        { name: 'owner', type: 'relation', required: true, maxSelect: 1, collectionId: users.id, cascadeDelete: true },
        { name: 'date', type: 'date', required: true },
        { name: 'sync_id', type: 'text', required: true },
        { name: 'updated_by', type: 'relation', maxSelect: 1, collectionId: users.id },
        { name: 'deleted_at', type: 'date' },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_streak_freezes_day ON streak_freezes (space, owner, date)'],
    })
    const AUTH = '@request.auth.id != ""'
    const SPACE = AUTH + ' && space.space_members_via_space.user ?= @request.auth.id'
    const EDIT_ROLE = '@request.auth.id != "" && space.space_members_via_space.role ?!= "viewer"'
    freezes.listRule = SPACE
    freezes.viewRule = SPACE
    freezes.createRule = EDIT_ROLE
    freezes.updateRule = EDIT_ROLE
    freezes.deleteRule = EDIT_ROLE
    freezes.fields.add(new AutodateField({ name: 'created', system: true, onCreate: true }))
    freezes.fields.add(new AutodateField({ name: 'updated', system: true, onCreate: true, onUpdate: true }))
    app.save(freezes)
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('streak_freezes'))
    } catch (e) {
      /* ignore */
    }
  },
)
