/// <reference path="../../pb_data/types.d.ts" />
/** T042 — change_log writer used by pull-by-delta. */

function writeChange(app, entry) {
  app
    .db()
    .newQuery(
      'INSERT INTO change_log (space, entity, entity_id, op, updated_at) VALUES ({:space}, {:entity}, {:entityId}, {:op}, {:updatedAt})',
    )
    .bind({
      space: entry.space,
      entity: entry.entity,
      entityId: entry.entityId,
      op: entry.op,
      updatedAt: entry.updatedAt,
    })
    .execute()
}

function latestSeq(app) {
  var rows = arrayOf(new DynamicModel({ seq: 0 }))
  app.db().newQuery('SELECT COALESCE(MAX(seq), 0) AS seq FROM change_log').all(rows)
  return rows.length > 0 ? rows[0].seq : 0
}

module.exports = { writeChange: writeChange, latestSeq: latestSeq }
