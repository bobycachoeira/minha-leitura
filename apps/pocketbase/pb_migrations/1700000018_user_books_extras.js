/// <reference path="../pb_data/types.d.ts" />
/** Fase 1 — extras do user_books: resenha (com flag pública) e fila "ler a seguir". */
migrate(
  (app) => {
    const c = app.findCollectionByNameOrId('user_books')
    if (!c.fields.getByName('review')) {
      c.fields.add(new Field({ name: 'review', type: 'text', max: 500 }))
    }
    if (!c.fields.getByName('review_public')) {
      c.fields.add(new Field({ name: 'review_public', type: 'bool' }))
    }
    if (!c.fields.getByName('queue_order')) {
      c.fields.add(new Field({ name: 'queue_order', type: 'number', min: 0, onlyInt: true }))
    }
    app.save(c)
  },
  () => {
    /* keep data */
  },
)
