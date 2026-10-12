/// <reference path="../pb_data/types.d.ts" />
/** Manual ordering for goals. */
migrate(
  (app) => {
    const goals = app.findCollectionByNameOrId('goals')
    if (!goals.fields.getByName('order')) {
      goals.fields.add(new Field({ name: 'order', type: 'number', min: 0, onlyInt: true }))
    }
    app.save(goals)
  },
  () => {
    /* keep data */
  },
)
