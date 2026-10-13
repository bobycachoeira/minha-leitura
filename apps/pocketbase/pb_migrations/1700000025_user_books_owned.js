/// <reference path="../pb_data/types.d.ts" />
/**
 * Fase 3/polish — separa "quero ler" (desejo) de "tenho o livro" (estante).
 * Backfill: livros já em leitura/lidos/deixados passam a ser "tenho".
 */
migrate(
  (app) => {
    const c = app.findCollectionByNameOrId('user_books')
    if (!c.fields.getByName('owned')) {
      c.fields.add(new Field({ name: 'owned', type: 'bool' }))
    }
    app.save(c)

    const records = app.findRecordsByFilter('user_books', 'status != "quero_ler"', '', 0, 0, {})
    for (let i = 0; i < records.length; i++) {
      records[i].set('owned', true)
      app.save(records[i])
    }
  },
  () => {
    /* keep data */
  },
)
