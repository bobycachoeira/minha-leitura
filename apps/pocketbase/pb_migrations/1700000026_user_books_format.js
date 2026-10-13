/// <reference path="../pb_data/types.d.ts" />
/** Formato do livro que eu tenho: físico ou e-reader. */
migrate(
  (app) => {
    const c = app.findCollectionByNameOrId('user_books')
    if (!c.fields.getByName('format')) {
      c.fields.add(new Field({ name: 'format', type: 'select', maxSelect: 1, values: ['fisico', 'ereader'] }))
    }
    app.save(c)
  },
  () => {
    /* keep data */
  },
)
