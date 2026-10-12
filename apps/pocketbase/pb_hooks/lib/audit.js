/// <reference path="../../pb_data/types.d.ts" />
/** T039 — audit trail writer (sensitive actions; never stores secrets). */

var http = require(__hooks + '/lib/http.js')

function writeAudit(app, entry) {
  try {
    var collection = app.findCollectionByNameOrId('audit_logs')
    var record = new Record(collection)
    record.set('space', entry.space)
    record.set('actor', entry.actor)
    record.set('action', entry.action)
    if (entry.entity) record.set('entity', entry.entity)
    if (entry.entityId) record.set('entity_id', entry.entityId)
    if (entry.before) record.set('before', entry.before)
    if (entry.after) record.set('after', entry.after)
    app.save(record)
  } catch (err) {
    http.logStructured('audit.write_failed', { action: entry.action, error: String(err) })
  }
  http.logStructured('audit', {
    space: entry.space,
    actor: entry.actor,
    action: entry.action,
    entity: entry.entity,
    entity_id: entry.entityId,
  })
}

module.exports = { writeAudit: writeAudit }
