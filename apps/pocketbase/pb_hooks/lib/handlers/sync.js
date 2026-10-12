/// <reference path="../../pb_data/types.d.ts" />
/**
 * T043/T044 — generic sync endpoints.
 *  POST /api/sync/push : idempotent batch apply, keyed by (space, entity, sync_id)
 *  GET  /api/sync/pull : delta pull by cursor, including soft deletes
 */

var http = require(__hooks + '/lib/http.js')
var auth = require(__hooks + '/lib/auth.js')
var changelog = require(__hooks + '/lib/changelog.js')
var ratelimit = require(__hooks + '/lib/ratelimit.js')
var engine = require(__hooks + '/lib/goals-engine.js')

/** Entities whose records carry an `owner` (personal) field. */
var OWNER_ENTITIES = ['user_books', 'reading_logs', 'goals', 'goal_periods', 'achievements']

var SYNC_ENTITIES = [
  'books',
  'user_books',
  'reading_logs',
  'goals',
  'goal_periods',
  'achievements',
  'posts',
  'reactions',
  'comments',
  'challenges',
]

var FIELD_MAP = {
  syncId: 'sync_id',
  updatedBy: 'updated_by',
  deletedAt: 'deleted_at',
  currentPage: 'current_page',
  startedAt: 'started_at',
  finishedAt: 'finished_at',
  totalPages: 'total_pages',
  coverUrl: 'cover_url',
  externalId: 'external_id',
  weekStart: 'week_start',
  graceHours: 'grace_hours',
  startsOn: 'starts_on',
  startDate: 'start_date',
  endDate: 'end_date',
  graceUntil: 'grace_until',
  closedAt: 'closed_at',
  reopenedAt: 'reopened_at',
  createdBy: 'created_by',
  refBook: 'ref_book',
  refAchievement: 'ref_achievement',
  goalPeriod: 'goal_period',
  cardTheme: 'card_theme',
  usedAt: 'used_at',
  usedBy: 'used_by',
  emailInvited: 'email_invited',
  tokenHash: 'token_hash',
}

/** Resolves a book relation id from a local id, sync id, external id or title. */
function resolveBookId(app, spaceId, rawId, externalId, title, bookSyncId) {
  if (rawId) {
    try {
      app.findRecordById('books', rawId)
      return rawId
    } catch (e) {
      // fall through
    }
  }
  if (bookSyncId) {
    try {
      return app.findFirstRecordByFilter('books', 'sync_id = {:s}', { s: bookSyncId }).id
    } catch (e5) {
      // fall through
    }
  }
  if (externalId) {
    try {
      return app.findFirstRecordByFilter('books', 'space = {:space} && external_id = {:ext}', {
        space: spaceId,
        ext: externalId,
      }).id
    } catch (e2) {
      // fall through
    }
  }
  if (title) {
    try {
      return app.findFirstRecordByFilter('books', 'space = {:space} && title = {:t}', {
        space: spaceId,
        t: String(title).trim(),
      }).id
    } catch (e3) {
      // fall through
    }
  }
  return rawId
}

function toSnake(key) {
  return FIELD_MAP[key] || key
}

function human(entity) {
  return entity
}

function h_sync_post_api_sync_push(c) {
  var userId = auth.requireAuth(c)
  if (!userId) return

  var body = http.requestBody(c)
  var operations = body.operations || []

  var limit = ratelimit.sync(userId)
  if (!limit.allowed) {
    return http.fail(c, 429, 'rate_limited', 'Muitas sincronizações; tente novamente')
  }

  var results = []
  var app = $app

  for (var i = 0; i < operations.length; i++) {
    var op = operations[i]
    var entity = op.entity
    var spaceId = op.space
    var syncId = op.syncId

    if (SYNC_ENTITIES.indexOf(entity) === -1) {
      results.push({ syncId: syncId, status: 'rejected', error: 'entidade desconhecida' })
      continue
    }

    var ctx = auth.requireSpaceForUser(app, spaceId, userId)
    if (!ctx) {
      results.push({ syncId: syncId, status: 'rejected', error: 'acesso negado ao espaço' })
      continue
    }

    // Idempotency: dedup by (space, entity, sync_id).
    try {
      app.findFirstRecordByFilter(
        'sync_events',
        'space = {:space} && entity = {:entity} && sync_id = {:sync}',
        { space: spaceId, entity: entity, sync: syncId },
      )
      results.push({ syncId: syncId, status: 'duplicate' })
      continue
    } catch (e) {
      // no duplicate found — proceed with apply
    }

    try {
      var collection = app.findCollectionByNameOrId(entity)
      var existing = null
      // Prefer updating by the known record id (edits), else by sync_id, else by
      // a natural key so offline-created/edited records update instead of duplicating.
      if (op.recordId) {
        try {
          existing = app.findRecordById(entity, op.recordId)
        } catch (e0) {
          existing = null
        }
      }
      if (!existing) {
        try {
          existing = app.findFirstRecordByFilter(entity, 'sync_id = {:sync}', { sync: syncId })
        } catch (e2) {
          existing = null
        }
      }
      if (!existing && entity === 'user_books' && op.payload && op.payload.book) {
        try {
          existing = app.findFirstRecordByFilter(
            'user_books',
            'space = {:space} && owner = {:owner} && book = {:book} && deleted_at = null',
            { space: spaceId, owner: userId, book: op.payload.book },
          )
        } catch (e3) {
          existing = null
        }
      }
      if (!existing && entity === 'books' && op.payload && op.payload.externalId) {
        try {
          existing = app.findFirstRecordByFilter(
            'books',
            'space = {:space} && external_id = {:ext} && deleted_at = null',
            { space: spaceId, ext: op.payload.externalId },
          )
        } catch (e4) {
          existing = null
        }
      }
      if (!existing && entity === 'reading_logs' && op.payload && op.payload.book) {
        try {
          var candidates = app.findRecordsByFilter(
            'reading_logs',
            'space = {:space} && owner = {:owner} && book = {:book} && deleted_at = null',
            '',
            0,
            0,
            { space: spaceId, owner: userId, book: op.payload.book },
          )
          for (var ci = 0; ci < candidates.length; ci++) {
            var sameDay = String(candidates[ci].get('date')).slice(0, 10) === String(op.payload.date || '').slice(0, 10)
            var samePages = op.payload.pages === undefined || candidates[ci].get('pages') === op.payload.pages
            if (sameDay && samePages) {
              existing = candidates[ci]
              break
            }
          }
        } catch (e5) {
          existing = null
        }
      }

      // A delete for a record we can't locate is a no-op (never create on delete).
      if (!existing && op.op === 'delete') {
        results.push({ syncId: syncId, status: 'applied', conflict: false })
        continue
      }

      var record = existing || new Record(collection)

      // Last-Write-Wins (Constitution II): the server is the source of truth.
      // If the server copy is strictly newer, keep it and flag the conflict.
      var conflict = false
      if (existing && op.op !== 'delete') {
        var serverUpdated = existing.getString('updated') || existing.getString('created') || ''
        var clientUpdated = op.updatedAt || ''
        if (serverUpdated && clientUpdated) {
          if (new Date(serverUpdated).getTime() > new Date(clientUpdated).getTime()) {
            conflict = true
            results.push({ syncId: syncId, status: 'applied', conflict: true, record: existing.publicExport() })
            continue
          }
        }
      }

      if (!existing) {
        record.set('space', spaceId)
        record.set('sync_id', syncId)
        if (OWNER_ENTITIES.indexOf(entity) !== -1) {
          record.set('owner', userId)
        }
      }

      if (op.op === 'delete') {
        record.set('deleted_at', new Date().toISOString())
      } else {
        var payload = op.payload || {}
        var bookBound = entity === 'reading_logs' || entity === 'user_books'
        var resolvedBook = bookBound
          ? resolveBookId(app, spaceId, payload.book, payload.bookExternalId, payload.bookTitle, payload.bookSyncId)
          : null
        for (var key in payload) {
          if (!Object.prototype.hasOwnProperty.call(payload, key)) continue
          if (key === 'bookExternalId' || key === 'bookTitle' || key === 'bookSyncId') continue
          var value = payload[key]
          if (key === 'book' && resolvedBook) value = resolvedBook
          record.set(toSnake(key), value)
        }
      }
      record.set('updated_by', userId)
      app.save(record)

      var eventCollection = app.findCollectionByNameOrId('sync_events')
      var event = new Record(eventCollection)
      event.set('space', spaceId)
      event.set('entity', entity)
      event.set('sync_id', syncId)
      app.save(event)

      changelog.writeChange(app, {
        space: spaceId,
        entity: entity,
        entityId: record.id,
        op: op.op === 'delete' ? 'delete' : 'upsert',
        updatedAt: new Date().toISOString(),
      })

      // Offline-created reading data must trigger goal/achievement recalculation.
      try {
        if (entity === 'reading_logs') {
          var bookId = (op.payload && op.payload.book) || record.getString('book')
          engine.recalculateUserBookProgress(app, spaceId, userId, bookId)
          engine.recalculateGoals(app, spaceId, userId)
        } else if (entity === 'user_books') {
          engine.recalculateGoals(app, spaceId, userId)
        }
      } catch (recalcErr) {
        http.logStructured('sync.recalc_error', { error: String(recalcErr) })
      }

      results.push({ syncId: syncId, status: 'applied', conflict: conflict, record: record.publicExport() })
    } catch (err) {
      http.logStructured('sync.push_error', { entity: human(entity), error: String(err) })
      results.push({ syncId: syncId, status: 'rejected', error: String(err) })
    }
  }

  return http.ok(c, { results: results })
}

function h_sync_get_api_sync_pull(c) {
  var userId = auth.requireAuth(c)
  if (!userId) return

  var app = $app
  var since = http.queryParam(c, 'since')
  var sinceSeq = since ? parseInt(since, 10) : 0
  var limitParam = http.queryParam(c, 'limit')
  var limit = limitParam ? Math.min(parseInt(limitParam, 10), 500) : 200

  var spaces = []
  var memberships = app.findRecordsByFilter(
    'space_members',
    'user = {:user} && deleted_at = null',
    '',
    0,
    0,
    { user: userId },
  )
  for (var i = 0; i < memberships.length; i++) {
    spaces.push(memberships[i].getString('space'))
  }

  var changes = []
  if (spaces.length > 0) {
    var rows = arrayOf(
      new DynamicModel({ seq: 0, space: '', entity: '', entity_id: '', op: '', updated_at: '' }),
    )
    app
      .db()
      .newQuery(
        'SELECT seq, space, entity, entity_id, op, updated_at FROM change_log WHERE seq > {:since} ORDER BY seq ASC LIMIT {:limit}',
      )
      .bind({ since: sinceSeq, limit: limit + 1 })
      .all(rows)

    var cursor = sinceSeq
    for (var j = 0; j < rows.length && changes.length < limit; j++) {
      var row = rows[j]
      if (spaces.indexOf(row.space) === -1) {
        cursor = row.seq
        continue
      }
      var change = { entity: row.entity, op: row.op, entityId: row.entity_id, seq: row.seq }
      if (row.op === 'delete') {
        change.deletedAt = row.updated_at
      } else {
        try {
          var rec = app.findRecordById(row.entity, row.entity_id)
          change.record = rec.publicExport()
        } catch (e) {
          change.record = null
        }
      }
      changes.push(change)
      cursor = row.seq
    }
    return http.ok(c, { changes: changes, cursor: String(cursor), hasMore: rows.length > changes.length })
  }

  return http.ok(c, { changes: [], cursor: String(sinceSeq), hasMore: false })
}

module.exports = {
  h_sync_post_api_sync_push: h_sync_post_api_sync_push,
  h_sync_get_api_sync_pull: h_sync_get_api_sync_pull
}
