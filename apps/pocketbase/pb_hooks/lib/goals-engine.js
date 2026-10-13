/// <reference path="../../pb_data/types.d.ts" />
/**
 * T084/T085/T134 — goal period engine shared by reading and goals routes.
 * Uses the exact same pure functions as the client (Constitution III).
 */

var shared = require(__hooks + '/lib/shared.js')

function findOrNull(app, collection, filter, params) {
  try {
    return app.findFirstRecordByFilter(collection, filter, params)
  } catch (e) {
    return null
  }
}

/** Finds a goal period by its start business date (one period per start). */
function findPeriod(app, goalId, startDate, endDate) {
  var records = app.findRecordsByFilter('goal_periods', 'goal = {:goal} && deleted_at = null', 'start_date', 0, 0, {
    goal: goalId,
  })
  for (var i = 0; i < records.length; i++) {
    var s = String(records[i].get('start_date')).slice(0, 10)
    if (s === startDate) return records[i]
  }
  return null
}

function uid() {
  return $security.randomString(15)
}

function recalculateUserBookProgress(app, spaceId, userId, bookId) {
  var logs = app.findRecordsByFilter(
    'reading_logs',
    'space = {:space} && owner = {:owner} && book = {:book} && deleted_at = null',
    'date',
    0,
    0,
    { space: spaceId, owner: userId, book: bookId },
  )
  var maxPage = 0
  for (var i = 0; i < logs.length; i++) {
    var end = logs[i].get('end_page')
    if (end && end > maxPage) maxPage = end
  }
  var userBook = findOrNull(
    app,
    'user_books',
    'space = {:space} && owner = {:owner} && book = {:book} && deleted_at = null',
    { space: spaceId, owner: userId, book: bookId },
  )
  if (!userBook) return
  var book = null
  try {
    book = app.findRecordById('books', bookId)
  } catch (e) {
    book = null
  }
  var totalPages = book ? book.get('total_pages') : null
  var wasLido = userBook.getString('status') === 'lido'
  if (maxPage > 0) userBook.set('current_page', maxPage)
  if (totalPages && maxPage >= totalPages) {
    userBook.set('status', 'lido')
    if (!userBook.get('finished_at')) {
      userBook.set('finished_at', new Date().toISOString().slice(0, 10))
    }
  }
  app.save(userBook)
}

function recalculateGoals(app, spaceId, userId) {
  var goals = app.findRecordsByFilter(
    'goals',
    'space = {:space} && owner = {:owner} && active = true && deleted_at = null',
    '',
    0,
    0,
    { space: spaceId, owner: userId },
  )
  var tz = $os.getenv('CF_TIMEZONE') || shared.DEFAULT_TIMEZONE

  var logs = app.findRecordsByFilter(
    'reading_logs',
    'space = {:space} && owner = {:owner} && deleted_at = null',
    '',
    0,
    0,
    { space: spaceId, owner: userId },
  )
  var logLikes = []
  for (var l = 0; l < logs.length; l++) {
    logLikes.push({
      date: String(logs[l].get('date')).slice(0, 10),
      pages: logs[l].get('pages') || 0,
      deletedAt: logs[l].getString('deleted_at') || null,
    })
  }

  var books = app.findRecordsByFilter(
    'user_books',
    'space = {:space} && owner = {:owner} && deleted_at = null',
    '',
    0,
    0,
    { space: spaceId, owner: userId },
  )
  var bookLikes = []
  for (var b = 0; b < books.length; b++) {
    var finished = books[b].get('finished_at')
    bookLikes.push({
      status: books[b].getString('status'),
      finishedAt: finished ? String(finished).slice(0, 10) : null,
    })
  }

  for (var g = 0; g < goals.length; g++) {
    var goal = goals[g]
    var schedule = {
      period: goal.getString('period'),
      weekStart: goal.get('week_start') || 1,
      graceHours: goal.get('grace_hours') || 24,
    }
    var bounds = shared.resolvePeriod(schedule, shared.todayISODate(tz), tz)
    var result = shared.computePeriodProgress({
      metric: goal.getString('metric'),
      target: goal.get('target'),
      period: bounds,
      logs: logLikes,
      books: bookLikes,
    })

    var period = findPeriod(app, goal.id, bounds.startDate, bounds.endDate)
    if (!period) {
      var periodCollection = app.findCollectionByNameOrId('goal_periods')
      period = new Record(periodCollection)
      period.set('space', spaceId)
      period.set('owner', userId)
      period.set('goal', goal.id)
      period.set('start_date', bounds.startDate)
      period.set('end_date', bounds.endDate)
      period.set('target', goal.get('target'))
      period.set('grace_until', bounds.graceUntil)
      period.set('status', 'aberto')
      period.set('sync_id', uid())
    }
    // Closed periods are immutable (Constitution III).
    if (period.getString('status') === 'aberto') {
      period.set('progress', result.progress)
      period.set('status', result.status)
      if (result.status !== 'aberto') period.set('closed_at', new Date().toISOString())
      app.save(period)
      if (result.status === 'batida') materializeAchievement(app, period, goal, 'meta_batida')
      else if (result.status === 'nao_batida') materializeAchievement(app, period, goal, 'meta_nao_batida')
    }
  }

  try {
    evaluateMilestones(app, spaceId, userId)
  } catch (e) {
    /* milestones are best-effort */
  }
}

/** Unlocks future milestone badges (books/pages/best streak) for the user. */
function evaluateMilestones(app, spaceId, userId) {
  var defs = shared.MILESTONES || []
  if (!defs.length) return

  var existing = app.findRecordsByFilter(
    'milestones',
    'space = {:space} && owner = {:owner} && deleted_at = null',
    '',
    0,
    0,
    { space: spaceId, owner: userId },
  )
  var have = {}
  for (var i = 0; i < existing.length; i++) have[existing[i].getString('key')] = true

  var books = app.findRecordsByFilter(
    'user_books',
    'space = {:space} && owner = {:owner} && status = "lido" && deleted_at = null',
    '',
    0,
    0,
    { space: spaceId, owner: userId },
  )
  var logs = app.findRecordsByFilter(
    'reading_logs',
    'space = {:space} && owner = {:owner} && deleted_at = null',
    '',
    0,
    0,
    { space: spaceId, owner: userId },
  )
  var pages = 0
  for (var l = 0; l < logs.length; l++) pages += logs[l].get('pages') || 0

  var goals = app.findRecordsByFilter(
    'goals',
    'space = {:space} && owner = {:owner} && deleted_at = null',
    '',
    0,
    0,
    { space: spaceId, owner: userId },
  )
  var bestStreak = 0
  for (var g = 0; g < goals.length; g++) {
    var periods = app.findRecordsByFilter('goal_periods', 'goal = {:g} && deleted_at = null', '', 0, 0, { g: goals[g].id })
    var inputs = []
    for (var p = 0; p < periods.length; p++) {
      inputs.push({
        status: periods[p].getString('status'),
        startDate: String(periods[p].get('start_date')).slice(0, 10),
        endDate: String(periods[p].get('end_date')).slice(0, 10),
      })
    }
    bestStreak = Math.max(bestStreak, shared.computeStreak(inputs))
  }

  var collection = app.findCollectionByNameOrId('milestones')
  var notifCollection = app.findCollectionByNameOrId('notifications')
  for (var d = 0; d < defs.length; d++) {
    var def = defs[d]
    if (have[def.key]) continue
    var value = def.kind === 'books' ? books.length : def.kind === 'pages' ? pages : bestStreak
    if (value < def.threshold) continue
    var record = new Record(collection)
    record.set('space', spaceId)
    record.set('owner', userId)
    record.set('key', def.key)
    record.set('payload', { label: def.label, kind: def.kind, threshold: def.threshold })
    record.set('unlocked_at', new Date().toISOString())
    record.set('sync_id', uid())
    app.save(record)
    try {
      var notice = new Record(notifCollection)
      notice.set('user', userId)
      notice.set('actor', userId)
      notice.set('kind', 'milestone')
      notice.set('body', 'Você desbloqueou: ' + def.label)
      notice.set('is_read', false)
      app.save(notice)
    } catch (e) {
      /* notification best-effort */
    }
  }
}

function materializeAchievement(app, period, goal, kind) {
  var existing = findOrNull(app, 'achievements', 'goal_period = {:period}', { period: period.id })
  if (existing) return
  var collection = app.findCollectionByNameOrId('achievements')
  var record = new Record(collection)
  record.set('space', period.getString('space'))
  record.set('owner', period.getString('owner'))
  record.set('goal_period', period.id)
  record.set('kind', kind)

  var owner = period.getString('owner')
  var start = period.getString('start_date').slice(0, 10)
  var end = period.getString('end_date').slice(0, 10)

  // Books finished within the period (by title, for the share card).
  var userBooks = app.findRecordsByFilter(
    'user_books',
    'space = {:space} && owner = {:owner} && deleted_at = null',
    '',
    0,
    0,
    { space: period.getString('space'), owner: owner },
  )
  var bookTitles = []
  for (var i = 0; i < userBooks.length; i++) {
    var finished = userBooks[i].get('finished_at')
    var day = finished ? String(finished).slice(0, 10) : null
    if (userBooks[i].getString('status') === 'lido' && day && day >= start && day <= end) {
      try {
        bookTitles.push(app.findRecordById('books', userBooks[i].getString('book')).getString('title'))
      } catch (e) {
        // ignore missing book
      }
    }
  }

  // Streak of consecutive hit periods up to this one.
  var periods = app.findRecordsByFilter('goal_periods', 'goal = {:g} && deleted_at = null', 'start_date', 0, 0, {
    g: goal.id,
  })
  var streakInputs = []
  for (var s = 0; s < periods.length; s++) {
    streakInputs.push({
      status: periods[s].getString('status'),
      startDate: periods[s].getString('start_date').slice(0, 10),
      endDate: periods[s].getString('end_date').slice(0, 10),
    })
  }
  var streak = shared.computeStreak(streakInputs)

  record.set('payload', {
    metric: goal.getString('metric'),
    period: goal.getString('period'),
    target: period.get('target'),
    progress: period.get('progress'),
    startDate: period.getString('start_date'),
    endDate: period.getString('end_date'),
    streak: streak,
    books: bookTitles,
  })
  record.set('sync_id', uid())
  app.save(record)

  // In-app notification for the owner when a period closes (self event).
  try {
    var nCollection = app.findCollectionByNameOrId('notifications')
    var notice = new Record(nCollection)
    notice.set('user', owner)
    notice.set('actor', owner)
    notice.set('kind', 'period')
    notice.set(
      'body',
      kind === 'meta_batida'
        ? 'Você bateu a meta de ' + period.get('target') + ' ' + (goal.getString('metric') === 'paginas' ? 'páginas' : 'livros')
        : 'Período encerrado sem bater a meta',
    )
    notice.set('is_read', false)
    app.save(notice)
  } catch (e) {
    /* notifications are best-effort */
  }
  // No automatic feed post — sharing is opt-in from the app.
}

/** Removes orphan achievements (missing period, or period reverted to `aberto`). */
function cleanupAchievements(app) {
  var achievements = app.findRecordsByFilter('achievements', '', '', 0, 0, {})
  for (var i = 0; i < achievements.length; i++) {
    var period = null
    try {
      period = app.findRecordById('goal_periods', achievements[i].getString('goal_period'))
    } catch (e) {
      period = null
    }
    if (!period) {
      app.delete(achievements[i])
      continue
    }
    if (period.getString('status') === 'aberto') app.delete(achievements[i])
  }
}

module.exports = {
  recalculateUserBookProgress: recalculateUserBookProgress,
  recalculateGoals: recalculateGoals,
  materializeAchievement: materializeAchievement,
  cleanupAchievements: cleanupAchievements,
  evaluateMilestones: evaluateMilestones,
  uid: uid,
}
