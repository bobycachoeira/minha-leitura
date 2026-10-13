/// <reference path="../pb_data/types.d.ts" />
/** Novo status: "ainda vou ler" (tenho o livro, mas não comecei). */
migrate(
  (app) => {
    const c = app.findCollectionByNameOrId('user_books')
    c.fields.removeByName('status')
    c.fields.add(
      new Field({
        name: 'status',
        type: 'select',
        required: true,
        maxSelect: 1,
        values: ['quero_ler', 'a_ler', 'lendo', 'lido', 'abandonado'],
      }),
    )
    app.save(c)
  },
  (app) => {
    try {
      const c = app.findCollectionByNameOrId('user_books')
      c.fields.removeByName('status')
      c.fields.add(
        new Field({
          name: 'status',
          type: 'select',
          required: true,
          maxSelect: 1,
          values: ['quero_ler', 'lendo', 'lido', 'abandonado'],
        }),
      )
      app.save(c)
    } catch (e) {
      /* ignore */
    }
  },
)
