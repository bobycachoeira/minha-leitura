/// <reference path="../pb_data/types.d.ts" />
/** Fase 1 — extras do registro de leitura: minutos (timer) e citação (Diário). */
migrate(
  (app) => {
    const c = app.findCollectionByNameOrId('reading_logs')
    if (!c.fields.getByName('minutes')) {
      c.fields.add(new Field({ name: 'minutes', type: 'number', min: 0, onlyInt: true }))
    }
    if (!c.fields.getByName('quote')) {
      c.fields.add(new Field({ name: 'quote', type: 'text', max: 2000 }))
    }
    if (!c.fields.getByName('quote_page')) {
      c.fields.add(new Field({ name: 'quote_page', type: 'number', min: 0, onlyInt: true }))
    }
    app.save(c)
  },
  () => {
    /* keep data */
  },
)
