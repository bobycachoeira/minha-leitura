/// <reference path="../pb_data/types.d.ts" />
/** Fase 3 (fundação) — preferências de notificação: horário e empurrões. */
migrate(
  (app) => {
    const c = app.findCollectionByNameOrId('notification_preferences')
    const bools = ['smart_reminders', 'partner_nudges', 'near_goal_nudges']
    for (const name of bools) {
      if (!c.fields.getByName(name)) c.fields.add(new Field({ name: name, type: 'bool' }))
    }
    if (!c.fields.getByName('reminder_time')) {
      c.fields.add(new Field({ name: 'reminder_time', type: 'text', max: 5 }))
    }
    app.save(c)
  },
  () => {
    /* keep data */
  },
)
