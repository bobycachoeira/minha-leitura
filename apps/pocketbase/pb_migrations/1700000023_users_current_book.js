/// <reference path="../pb_data/types.d.ts" />
/** Fase 3 (antecipado) — "leitura atual" fixada manualmente pelo usuário. */
migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    if (!users.fields.getByName('current_book')) {
      users.fields.add(new Field({ name: 'current_book', type: 'text', max: 20 }))
    }
    app.save(users)
  },
  () => {
    /* keep data */
  },
)
