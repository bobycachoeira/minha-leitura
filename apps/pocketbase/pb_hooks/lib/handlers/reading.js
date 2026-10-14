/// <reference path="../../pb_data/types.d.ts" />
/**
 * US2 — library endpoints (T074/T075/T076).
 *  GET/POST  /api/books
 *  GET/POST  /api/user-books, PATCH /api/user-books/{id}
 *  GET/POST  /api/reading-logs
 *  GET       /api/catalog/search (Open Library proxy, max 10 results)
 *
 * All business rules are validated server-side and space-isolated (FR-004/005).
 */

var http = require(__hooks + '/lib/http.js')
var auth = require(__hooks + '/lib/auth.js')
var changelog = require(__hooks + '/lib/changelog.js')
var shared = require(__hooks + '/lib/shared.js')
var engine = require(__hooks + '/lib/goals-engine.js')

var READ_STATUSES = ['quero_ler', 'lendo', 'lido', 'abandonado']
var CATALOG_MAX_RESULTS = 10

function uid() {
  return $security.randomString(15)
}

function requireSpaceOrFail(c) {
  var spaceId = http.queryParam(c, 'space')
  if (!spaceId) {
    http.fail(c, 400, 'space_required', 'space é obrigatório')
    return null
  }
  return auth.requireSpace($app, c, spaceId)
}

function parseBody(c) {
  return http.requestBody(c) || {}
}

function findOrThrow(collection, filter, params) {
  try {
    return $app.findFirstRecordByFilter(collection, filter, params)
  } catch (e) {
    return null
  }
}

// ---------------------------------------------------------------- books

function h_reading_get_api_books(c) {
  var ctx = requireSpaceOrFail(c)
  if (!ctx) return
  var records = $app.findRecordsByFilter('books', 'space = {:space} && deleted_at = null', '-created', 0, 0, {
    space: http.queryParam(c, 'space'),
  })
  return http.ok(c, records.map(function (r) {
    return r.publicExport()
  }))
}

function h_reading_post_api_books(c) {
  var ctx = requireSpaceOrFail(c)
  if (!ctx) return
  var body = parseBody(c)
  if (!body.title || String(body.title).length < 1 || String(body.title).length > 300) {
    return http.fail(c, 422, 'invalid_title', 'título é obrigatório (1–300)')
  }
  var collection = $app.findCollectionByNameOrId('books')
  var record = new Record(collection)
  record.set('space', http.queryParam(c, 'space'))
  record.set('title', body.title)
  record.set('authors', body.authors || [])
  record.set('isbn', body.isbn || '')
  record.set('cover_url', body.coverUrl || '')
  if (body.totalPages) record.set('total_pages', body.totalPages)
  record.set('genres', body.genres || [])
  record.set('source', body.source || 'manual')
  record.set('external_id', body.externalId || '')
  record.set('created_by', ctx.userId)
  record.set('sync_id', body.syncId || uid())
  $app.save(record)
  changelog.writeChange($app, {
    space: record.getString('space'),
    entity: 'books',
    entityId: record.id,
    op: 'upsert',
    updatedAt: new Date().toISOString(),
  })
  return http.ok(c, record.publicExport(), 201)
}

// ------------------------------------------------------------ user-books

function h_reading_get_api_user_books(c) {
  var ctx = requireSpaceOrFail(c)
  if (!ctx) return
  var filter = 'space = {:space} && owner = {:owner} && deleted_at = null'
  var params = { space: http.queryParam(c, 'space'), owner: ctx.userId }
  var status = http.queryParam(c, 'status')
  if (status) {
    filter += ' && status = {:status}'
    params.status = status
  }
  var records = $app.findRecordsByFilter('user_books', filter, '-updated', 0, 0, params)
  return http.ok(c, records.map(function (r) {
    return r.publicExport()
  }))
}

function h_reading_post_api_user_books(c) {
  var ctx = requireSpaceOrFail(c)
  if (!ctx) return
  var body = parseBody(c)
  if (!body.book) return http.fail(c, 422, 'invalid_book', 'book é obrigatório')
  if (body.status && READ_STATUSES.indexOf(body.status) === -1) {
    return http.fail(c, 422, 'invalid_status', 'status inválido')
  }
  var collection = $app.findCollectionByNameOrId('user_books')
  var record = new Record(collection)
  record.set('space', http.queryParam(c, 'space'))
  record.set('owner', ctx.userId)
  record.set('book', body.book)
  record.set('status', body.status || 'quero_ler')
  record.set('current_page', body.currentPage || 0)
  record.set('favorite', !!body.favorite)
  if (body.rating !== undefined && body.rating !== null) record.set('rating', body.rating)
  if (body.notes) record.set('notes', body.notes)
  if (body.review) record.set('review', body.review)
  if (body.reviewPublic !== undefined) record.set('review_public', !!body.reviewPublic)
  if (body.queueOrder !== undefined) record.set('queue_order', body.queueOrder)
  if (body.owned !== undefined) record.set('owned', !!body.owned)
  if (body.format !== undefined) record.set('format', body.format || '')
  if (body.startedAt) record.set('started_at', body.startedAt)
  if (body.finishedAt) record.set('finished_at', body.finishedAt)
  record.set('sync_id', body.syncId || uid())
  $app.save(record)
  changelog.writeChange($app, {
    space: record.getString('space'),
    entity: 'user_books',
    entityId: record.id,
    op: 'upsert',
    updatedAt: new Date().toISOString(),
  })
  return http.ok(c, record.publicExport(), 201)
}

function h_reading_patch_api_user_books_id(c) {
  var spaceId = http.queryParam(c, 'space')
  var ctx = auth.requireSpace($app, c, spaceId)
  if (!ctx) return
  var record = null
  try {
    record = $app.findRecordById('user_books', http.pathParam(c, 'id'))
  } catch (e) {
    return http.fail(c, 404, 'not_found', 'item do acervo não encontrado')
  }
  if (record.getString('space') !== spaceId) {
    return http.fail(c, 403, 'forbidden', 'acesso negado')
  }
  var body = parseBody(c)
  if (body.status) {
    if (READ_STATUSES.indexOf(body.status) === -1) {
      return http.fail(c, 422, 'invalid_status', 'status inválido')
    }
    record.set('status', body.status)
    if (body.status === 'lido' && !body.finishedAt) {
      record.set('finished_at', new Date().toISOString().slice(0, 10))
    }
  }
  if (body.currentPage !== undefined) record.set('current_page', body.currentPage)
  if (body.rating !== undefined) record.set('rating', body.rating)
  if (body.notes !== undefined) record.set('notes', body.notes)
  if (body.review !== undefined) record.set('review', body.review)
  if (body.reviewPublic !== undefined) record.set('review_public', !!body.reviewPublic)
  if (body.queueOrder !== undefined) record.set('queue_order', body.queueOrder)
  if (body.owned !== undefined) record.set('owned', !!body.owned)
  if (body.format !== undefined) record.set('format', body.format || '')
  $app.save(record)
  // Book-goal progress depends on status/finished_at (FR-036); recalc goals.
  if (body.status !== undefined) engine.recalculateGoals($app, spaceId, ctx.userId)
  changelog.writeChange($app, {
    space: spaceId,
    entity: 'user_books',
    entityId: record.id,
    op: 'upsert',
    updatedAt: new Date().toISOString(),
  })
  return http.ok(c, record.publicExport())
}

// --------------------------------------------------------- reading-logs

function h_reading_get_api_reading_logs(c) {
  var ctx = requireSpaceOrFail(c)
  if (!ctx) return
  var filter = 'space = {:space} && owner = {:owner} && deleted_at = null'
  var params = { space: http.queryParam(c, 'space'), owner: ctx.userId }
  if (http.queryParam(c, 'from')) {
    filter += ' && date >= {:from}'
    params.from = http.queryParam(c, 'from')
  }
  if (http.queryParam(c, 'to')) {
    filter += ' && date <= {:to}'
    params.to = http.queryParam(c, 'to')
  }
  if (http.queryParam(c, 'book')) {
    filter += ' && book = {:book}'
    params.book = http.queryParam(c, 'book')
  }
  var records = $app.findRecordsByFilter('reading_logs', filter, 'date', 0, 0, params)
  return http.ok(c, records.map(function (r) {
    return r.publicExport()
  }))
}

function h_reading_post_api_reading_logs(c) {
  var ctx = requireSpaceOrFail(c)
  if (!ctx) return
  var body = parseBody(c)
  if (!body.book || !body.date || !body.pages || body.pages < 1) {
    return http.fail(c, 422, 'invalid_log', 'book, date e pages(>=1) são obrigatórios')
  }
  var collection = $app.findCollectionByNameOrId('reading_logs')
  var record = new Record(collection)
  record.set('space', http.queryParam(c, 'space'))
  record.set('owner', ctx.userId)
  record.set('book', body.book)
  record.set('date', body.date)
  record.set('pages', body.pages)
  if (body.startPage) record.set('start_page', body.startPage)
  if (body.endPage) record.set('end_page', body.endPage)
  if (body.note) record.set('note', body.note)
  if (body.minutes !== undefined) record.set('minutes', body.minutes)
  if (body.quote) record.set('quote', body.quote)
  if (body.quotePage !== undefined) record.set('quote_page', body.quotePage)
  record.set('sync_id', body.syncId || uid())
  $app.save(record)

  // Recalculate progress + affected goal periods (T076, T134, FR-018).
  engine.recalculateUserBookProgress($app, http.queryParam(c, 'space'), ctx.userId, body.book)
  engine.recalculateGoals($app, http.queryParam(c, 'space'), ctx.userId)

  changelog.writeChange($app, {
    space: record.getString('space'),
    entity: 'reading_logs',
    entityId: record.id,
    op: 'upsert',
    updatedAt: new Date().toISOString(),
  })
  return http.ok(c, record.publicExport(), 201)
}

function h_reading_patch_api_reading_logs_id(c) {
  var spaceId = http.queryParam(c, 'space')
  var ctx = auth.requireSpace($app, c, spaceId)
  if (!ctx) return
  var record = null
  try {
    record = $app.findRecordById('reading_logs', http.pathParam(c, 'id'))
  } catch (e) {
    return http.fail(c, 404, 'not_found', 'lançamento não encontrado')
  }
  if (record.getString('space') !== spaceId) return http.fail(c, 403, 'forbidden', 'acesso negado')
  var data = parseBody(c)
  if (data.pages) record.set('pages', data.pages)
  if (data.date) record.set('date', data.date)
  if (data.endPage !== undefined) record.set('end_page', data.endPage)
  if (data.note !== undefined) record.set('note', data.note)
  if (data.minutes !== undefined) record.set('minutes', data.minutes)
  if (data.quote !== undefined) record.set('quote', data.quote)
  if (data.quotePage !== undefined) record.set('quote_page', data.quotePage)
  $app.save(record)
  engine.recalculateUserBookProgress($app, spaceId, ctx.userId, record.getString('book'))
  engine.recalculateGoals($app, spaceId, ctx.userId)
  changelog.writeChange($app, { space: spaceId, entity: 'reading_logs', entityId: record.id, op: 'upsert', updatedAt: new Date().toISOString() })
  return http.ok(c, record.publicExport())
}

function h_reading_delete_api_reading_logs_id(c) {
  var spaceId = http.queryParam(c, 'space')
  var ctx = auth.requireSpace($app, c, spaceId)
  if (!ctx) return
  var record = null
  try {
    record = $app.findRecordById('reading_logs', http.pathParam(c, 'id'))
  } catch (e) {
    return http.fail(c, 404, 'not_found', 'lançamento não encontrado')
  }
  if (record.getString('space') !== spaceId) return http.fail(c, 403, 'forbidden', 'acesso negado')
  record.set('deleted_at', new Date().toISOString())
  $app.save(record)
  engine.recalculateUserBookProgress($app, spaceId, ctx.userId, record.getString('book'))
  engine.recalculateGoals($app, spaceId, ctx.userId)
  changelog.writeChange($app, { space: spaceId, entity: 'reading_logs', entityId: record.id, op: 'delete', updatedAt: new Date().toISOString() })
  return http.ok(c, { deleted: true })
}


// ------------------------------------------------------- dashboard

function h_reading_get_api_dashboard(c) {
  var spaceId = http.queryParam(c, 'space')
  var ctx = auth.requireSpace($app, c, spaceId)
  if (!ctx) return
  // FR-024: any space member may view another member's progress.
  var owner = http.queryParam(c, 'owner') || ctx.userId
  engine.recalculateGoals($app, spaceId, owner)

  var periods = $app.findRecordsByFilter(
    'goal_periods',
    'space = {:space} && owner = {:owner} && deleted_at = null',
    '-start_date',
    50,
    0,
    { space: spaceId, owner: owner },
  )
  var activeGoals = []
  var streakInputs = []
  for (var i = 0; i < periods.length; i++) {
    var status = periods[i].getString('status')
    if (status === 'aberto') {
      var exported = periods[i].publicExport()
      try {
        var linkedGoal = $app.findRecordById('goals', periods[i].getString('goal'))
        exported.metric = linkedGoal.getString('metric')
        exported.periodUnit = linkedGoal.getString('period')
      } catch (eg) {
        exported.metric = null
      }
      activeGoals.push(exported)
    } else {
      streakInputs.push({
        status: status,
        startDate: String(periods[i].get('start_date')).slice(0, 10),
        endDate: String(periods[i].get('end_date')).slice(0, 10),
      })
    }
  }

  var logs = $app.findRecordsByFilter(
    'reading_logs',
    'space = {:space} && owner = {:owner} && deleted_at = null',
    'date',
    0,
    0,
    { space: spaceId, owner: owner },
  )
  var byDay = {}
  for (var l = 0; l < logs.length; l++) {
    var day = String(logs[l].get('date')).slice(0, 10)
    byDay[day] = (byDay[day] || 0) + (logs[l].get('pages') || 0)
  }
  var pagesByDay = []
  for (var day in byDay) {
    if (Object.prototype.hasOwnProperty.call(byDay, day)) pagesByDay.push({ date: day, pages: byDay[day] })
  }
  pagesByDay.sort(function (a, b) {
    return a.date < b.date ? -1 : a.date > b.date ? 1 : 0
  })

  var dayStreak = shared.computeDayStreak(Object.keys(byDay), shared.todayISODate())

  return http.ok(c, {
    activeGoals: activeGoals,
    streak: shared.computeStreak(streakInputs),
    dayStreak: dayStreak,
    pagesByDay: pagesByDay,
  })
}

// ------------------------------------------------------- catalog search

function mapOpenLibraryDoc(doc) {
  return {
    source: 'open_library',
    externalId: doc.key || (doc.isbn && doc.isbn[0]) || '',
    title: doc.title || 'Sem título',
    authors: doc.author_name || [],
    isbn: (doc.isbn && doc.isbn[0]) || null,
    coverUrl: doc.cover_i ? 'https://covers.openlibrary.org/b/id/' + doc.cover_i + '-M.jpg' : null,
    totalPages: doc.number_of_pages_median || null,
    genres: (doc.subject || []).slice(0, 5),
  }
}

function h_reading_get_api_catalog_search(c) {
  var query = http.queryParam(c, 'q')
  var isbn = http.queryParam(c, 'isbn')
  if (!query && !isbn) {
    return http.fail(c, 400, 'query_required', 'informe q ou isbn')
  }
  var url = isbn
    ? 'https://openlibrary.org/isbn/' + encodeURIComponent(isbn) + '.json'
    : 'https://openlibrary.org/search.json?limit=' + CATALOG_MAX_RESULTS + '&q=' + encodeURIComponent(query)

  var res
  try {
    res = $http.send({ url: url, method: 'GET', timeout: 8 })
  } catch (err) {
    // External catalog failure degrades to empty list (FR-013).
    return http.ok(c, [])
  }
  if (res.statusCode >= 400 || !res.json) return http.ok(c, [])

  var docs = res.json.docs ? res.json.docs : [res.json]
  var out = []
  for (var i = 0; i < docs.length && out.length < CATALOG_MAX_RESULTS; i++) {
    out.push(mapOpenLibraryDoc(docs[i]))
  }
  return http.ok(c, out)
}

// --------------------------------------------------- recommendations (US7)

var TTL_DAYS = 30

function h_reading_get_api_recommendations(c) {
  var spaceId = http.queryParam(c, 'space')
  var ctx = auth.requireSpace($app, c, spaceId)
  if (!ctx) return
  var existing = $app.findRecordsByFilter(
    'recommendations',
    'space = {:space} && owner = {:owner} && dismissed = false && added = false',
    '-score',
    10,
    0,
    { space: spaceId, owner: ctx.userId },
  )
  if (existing.length > 0) {
    return http.ok(c, existing.map(function (r) {
      return r.publicExport()
    }))
  }
  return http.ok(c, generateRecommendations(spaceId, ctx.userId))
}

function pickTop(scores) {
  var best = null
  var bestScore = 0
  for (var key in scores) {
    if (Object.prototype.hasOwnProperty.call(scores, key) && scores[key] > bestScore) {
      bestScore = scores[key]
      best = key
    }
  }
  return best
}

function generateRecommendations(spaceId, userId) {
  var userBooks = $app.findRecordsByFilter(
    'user_books',
    'space = {:space} && owner = {:owner} && deleted_at = null',
    '',
    0,
    0,
    { space: spaceId, owner: userId },
  )
  var booksRecords = $app.findRecordsByFilter('books', 'space = {:space} && deleted_at = null', '', 0, 0, {
    space: spaceId,
  })
  var byId = {}
  for (var i = 0; i < booksRecords.length; i++) {
    byId[booksRecords[i].id] = booksRecords[i]
  }

  var ownedIds = {}
  // Exclude anything already dismissed or added so suggestions don't reappear.
  var priorRecs = $app.findRecordsByFilter(
    'recommendations',
    'space = {:space} && owner = {:owner}',
    '',
    0,
    0,
    { space: spaceId, owner: userId },
  )
  for (var p = 0; p < priorRecs.length; p++) {
    var priorId = priorRecs[p].getString('external_id')
    if (priorId) ownedIds[priorId] = true
  }
  var genreScore = {}
  var authorScore = {}
  // Weight by reading status so any library gives a signal (not just 'lido').
  var weights = { lido: 3, lendo: 2, quero_ler: 1, abandonado: 0 }
  for (var b = 0; b < userBooks.length; b++) {
    var book = byId[userBooks[b].getString('book')]
    if (!book) continue
    var ext = book.getString('external_id')
    if (ext) ownedIds[ext] = true

    var status = userBooks[b].getString('status')
    var weight = weights[status]
    if (weight === undefined || weight === 0) continue
    if (userBooks[b].getBool('favorite')) weight += 2
    var rating = userBooks[b].get('rating')
    if (rating) weight += rating / 5

    var genres = http.jsonField(book, 'genres', [])
    for (var g = 0; g < genres.length; g++) {
      genreScore[genres[g]] = (genreScore[genres[g]] || 0) + weight
    }
    var authors = http.jsonField(book, 'authors', [])
    for (var a = 0; a < authors.length; a++) {
      authorScore[authors[a]] = (authorScore[authors[a]] || 0) + weight
    }
  }

  var topGenre = pickTop(genreScore)
  var topAuthor = pickTop(authorScore)
  var query = topGenre || topAuthor
  var reason = topGenre ? 'porque você gostou de ' + topGenre : 'porque você gostou de ' + topAuthor
  if (!query) {
    // Never leave Descobrir empty: fall back to a broad, safe query.
    query = 'fiction'
    reason = 'sugestões para começar'
  }
  var score = topGenre ? 1 : 1

  var res
  try {
    res = $http.send({ url: 'https://openlibrary.org/search.json?limit=50&q=' + encodeURIComponent(query), method: 'GET', timeout: 8 })
  } catch (e) {
    return []
  }
  if (res.statusCode >= 400 || !res.json || !res.json.docs) return []

  var collection = $app.findCollectionByNameOrId('recommendations')
  var out = []
  var expires = new Date(Date.now() + TTL_DAYS * 86400000).toISOString()
  for (var d = 0; d < res.json.docs.length && out.length < 10; d++) {
    var doc = res.json.docs[d]
    var externalId = doc.key || ''
    if (!externalId || ownedIds[externalId]) continue
    var record = new Record(collection)
    record.set('space', spaceId)
    record.set('owner', userId)
    record.set('external_id', externalId)
    record.set('title', doc.title || 'Sem título')
    record.set('authors', doc.author_name || [])
    record.set('cover_url', doc.cover_i ? 'https://covers.openlibrary.org/b/id/' + doc.cover_i + '-M.jpg' : '')
    record.set('reason', reason)
    record.set('source', 'open_library')
    record.set('score', score)
    record.set('dismissed', false)
    record.set('added', false)
    record.set('expires_at', expires)
    $app.save(record)
    out.push(record.publicExport())
  }
  return out
}

function h_reading_post_api_recommendations_id_dismiss(c) {
  var spaceId = http.queryParam(c, 'space')
  var ctx = auth.requireSpace($app, c, spaceId)
  if (!ctx) return
  var record = $app.findRecordById('recommendations', http.pathParam(c, 'id'))
  if (record.getString('space') !== spaceId) return http.fail(c, 403, 'forbidden', 'acesso negado')
  record.set('dismissed', true)
  $app.save(record)
  return http.ok(c, { dismissed: true })
}

function h_reading_post_api_recommendations_id_add(c) {
  var spaceId = http.queryParam(c, 'space')
  var ctx = auth.requireSpace($app, c, spaceId)
  if (!ctx) return
  var rec = $app.findRecordById('recommendations', http.pathParam(c, 'id'))
  if (rec.getString('space') !== spaceId) return http.fail(c, 403, 'forbidden', 'acesso negado')

  // Allow choosing where it lands: 'quero_ler' (Desejos) or 'lendo' (Estante).
  var data = http.requestBody(c)
  var status = data && data.status ? String(data.status) : 'quero_ler'
  if (READ_STATUSES.indexOf(status) === -1) status = 'quero_ler'

  var bookCollection = $app.findCollectionByNameOrId('books')
  var book = new Record(bookCollection)
  book.set('space', spaceId)
  book.set('title', rec.getString('title'))
  book.set('authors', http.jsonField(rec, 'authors', []))
  book.set('cover_url', rec.getString('cover_url'))
  book.set('source', 'open_library')
  book.set('external_id', rec.getString('external_id'))
  book.set('genres', [])
  book.set('created_by', ctx.userId)
  book.set('sync_id', engine.uid())
  $app.save(book)

  var userBookCollection = $app.findCollectionByNameOrId('user_books')
  var userBook = new Record(userBookCollection)
  userBook.set('space', spaceId)
  userBook.set('owner', ctx.userId)
  userBook.set('book', book.id)
  userBook.set('status', status)
  userBook.set('current_page', 0)
  userBook.set('favorite', false)
  userBook.set('sync_id', engine.uid())
  $app.save(userBook)

  // Emit change_log entries so clients pick these up on the next pull.
  changelog.writeChange($app, { space: spaceId, entity: 'books', entityId: book.id, op: 'upsert', updatedAt: new Date().toISOString() })
  changelog.writeChange($app, { space: spaceId, entity: 'user_books', entityId: userBook.id, op: 'upsert', updatedAt: new Date().toISOString() })

  rec.set('added', true)
  $app.save(rec)
  return http.ok(c, userBook.publicExport(), 201)
}

module.exports = {
  h_reading_get_api_books: h_reading_get_api_books,
  h_reading_post_api_books: h_reading_post_api_books,
  h_reading_get_api_user_books: h_reading_get_api_user_books,
  h_reading_post_api_user_books: h_reading_post_api_user_books,
  h_reading_patch_api_user_books_id: h_reading_patch_api_user_books_id,
  h_reading_get_api_reading_logs: h_reading_get_api_reading_logs,
  h_reading_post_api_reading_logs: h_reading_post_api_reading_logs,
  h_reading_patch_api_reading_logs_id: h_reading_patch_api_reading_logs_id,
  h_reading_delete_api_reading_logs_id: h_reading_delete_api_reading_logs_id,
  h_reading_get_api_dashboard: h_reading_get_api_dashboard,
  h_reading_get_api_catalog_search: h_reading_get_api_catalog_search,
  h_reading_get_api_recommendations: h_reading_get_api_recommendations,
  h_reading_post_api_recommendations_id_dismiss: h_reading_post_api_recommendations_id_dismiss,
  h_reading_post_api_recommendations_id_add: h_reading_post_api_recommendations_id_add
}
