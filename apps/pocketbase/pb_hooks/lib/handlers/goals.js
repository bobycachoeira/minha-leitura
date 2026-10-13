/// <reference path="../../pb_data/types.d.ts" />
/**
 * US3/US4 — goals, period closing/reopening and achievements.
 * Reopening is restricted to owner|partner with step-up and is audited (FR-017).
 */

var http = require(__hooks + '/lib/http.js')
var auth = require(__hooks + '/lib/auth.js')
var audit = require(__hooks + '/lib/audit.js')
var engine = require(__hooks + '/lib/goals-engine.js')
var shared = require(__hooks + '/lib/shared.js')

function body(c) {
  return http.requestBody(c) || {}
}

function h_goals_get_api_goals(c) {
  var spaceId = http.queryParam(c, 'space')
  var ctx = auth.requireSpace($app, c, spaceId)
  if (!ctx) return
  var records = $app.findRecordsByFilter(
    'goals',
    'space = {:space} && owner = {:owner} && deleted_at = null',
    'order,created',
    0,
    0,
    { space: spaceId, owner: ctx.userId },
  )
  return http.ok(c, records.map(function (r) {
    return r.publicExport()
  }))
}

function h_goals_post_api_goals(c) {
  var spaceId = http.queryParam(c, 'space')
  var ctx = auth.requireRole($app, c, spaceId, ['owner', 'partner'])
  if (!ctx) return
  var data = body(c)
  if (!data.metric || !data.period || !data.target || data.target < 1) {
    return http.fail(c, 422, 'invalid_goal', 'metric, period e target(>=1) são obrigatórios')
  }
  var schedule = { period: data.period, weekStart: data.weekStart, graceHours: data.graceHours }
  var collection = $app.findCollectionByNameOrId('goals')
  var record = new Record(collection)
  record.set('space', spaceId)
  record.set('owner', ctx.userId)
  record.set('metric', data.metric)
  record.set('period', data.period)
  record.set('target', data.target)
  record.set('week_start', schedule.weekStart === undefined ? 1 : schedule.weekStart)
  record.set('grace_hours', schedule.graceHours === undefined ? 24 : schedule.graceHours)
  record.set('active', data.active === undefined ? true : data.active)
  record.set('starts_on', data.startsOn || shared.todayISODate($os.getenv('CF_TIMEZONE') || shared.DEFAULT_TIMEZONE))
  var existing = $app.findRecordsByFilter(
    'goals',
    'space = {:space} && owner = {:owner} && deleted_at = null',
    '',
    0,
    0,
    { space: spaceId, owner: ctx.userId },
  )
  record.set('order', existing.length)
  record.set('sync_id', data.syncId || engine.uid())
  $app.save(record)
  engine.recalculateGoals($app, spaceId, ctx.userId)
  return http.ok(c, record.publicExport(), 201)
}

function h_goals_patch_api_goals_id(c) {
  var spaceId = http.queryParam(c, 'space')
  var ctx = auth.requireRole($app, c, spaceId, ['owner', 'partner'])
  if (!ctx) return
  var record = null
  try {
    record = $app.findRecordById('goals', http.pathParam(c, 'id'))
  } catch (e) {
    return http.fail(c, 404, 'not_found', 'meta não encontrada')
  }
  if (record.getString('space') !== spaceId) return http.fail(c, 403, 'forbidden', 'acesso negado')
  var data = body(c)
  // FR-035: a week_start change only affects the next period — the open/closed
  // periods keep their original boundaries (no retroactive re-bucketing).
  if (data.target) record.set('target', data.target)
  if (data.weekStart !== undefined) record.set('week_start', data.weekStart)
  if (data.graceHours !== undefined) record.set('grace_hours', data.graceHours)
  if (data.active !== undefined) record.set('active', data.active)
  if (data.order !== undefined) record.set('order', data.order)
  $app.save(record)
  engine.recalculateGoals($app, spaceId, ctx.userId)
  return http.ok(c, record.publicExport())
}

function h_goals_delete_api_goals_id(c) {
  var spaceId = http.queryParam(c, 'space')
  var ctx = auth.requireRole($app, c, spaceId, ['owner', 'partner'])
  if (!ctx) return
  var record = null
  try {
    record = $app.findRecordById('goals', http.pathParam(c, 'id'))
  } catch (e) {
    return http.fail(c, 404, 'not_found', 'meta não encontrada')
  }
  if (record.getString('space') !== spaceId) return http.fail(c, 403, 'forbidden', 'acesso negado')

  var now = new Date().toISOString()
  record.set('deleted_at', now)
  $app.save(record)

  // Soft-delete the derived periods and achievements too.
  var periods = $app.findRecordsByFilter('goal_periods', 'goal = {:g}', '', 0, 0, { g: record.id })
  for (var i = 0; i < periods.length; i++) {
    periods[i].set('deleted_at', now)
    $app.save(periods[i])
    var achs = $app.findRecordsByFilter('achievements', 'goal_period = {:p}', '', 0, 0, { p: periods[i].id })
    for (var a = 0; a < achs.length; a++) {
      achs[a].set('deleted_at', now)
      $app.save(achs[a])
    }
  }

  audit.writeAudit($app, {
    space: spaceId,
    actor: ctx.userId,
    action: 'goal.delete',
    entity: 'goals',
    entityId: record.id,
  })
  return http.ok(c, { deleted: true })
}

function h_goals_get_api_goals_id_periods(c) {
  var spaceId = http.queryParam(c, 'space')
  var ctx = auth.requireSpace($app, c, spaceId)
  if (!ctx) return
  var records = $app.findRecordsByFilter(
    'goal_periods',
    'goal = {:goal} && deleted_at = null',
    '-start_date',
    0,
    0,
    { goal: http.pathParam(c, 'id') },
  )
  return http.ok(c, records.map(function (r) {
    return r.publicExport()
  }))
}

function h_goals_get_api_goals_id_periods_current(c) {
  var spaceId = http.queryParam(c, 'space')
  var ctx = auth.requireSpace($app, c, spaceId)
  if (!ctx) return
  engine.recalculateGoals($app, spaceId, ctx.userId)
  var tz = $os.getenv('CF_TIMEZONE') || shared.DEFAULT_TIMEZONE
  var goal = $app.findRecordById('goals', http.pathParam(c, 'id'))
  var bounds = shared.resolvePeriod(
    { period: goal.getString('period'), weekStart: goal.get('week_start') || 1, graceHours: goal.get('grace_hours') || 24 },
    shared.todayISODate(tz),
    tz,
  )
  var period = null
  var periods = $app.findRecordsByFilter('goal_periods', 'goal = {:goal}', '', 0, 0, { goal: goal.id })
  for (var i = 0; i < periods.length; i++) {
    if (String(periods[i].get('start_date')).slice(0, 10) === bounds.startDate) {
      period = periods[i]
      break
    }
  }
  if (!period) return http.fail(c, 404, 'no_period', 'período corrente não encontrado')
  return http.ok(c, period.publicExport())
}

function h_goals_post_api_goal_periods_id_reopen(c) {
  var period = null
  try {
    period = $app.findRecordById('goal_periods', http.pathParam(c, 'id'))
  } catch (e) {
    return http.fail(c, 404, 'not_found', 'período não encontrado')
  }
  var spaceId = period.getString('space')
  var ctx = auth.requireRole($app, c, spaceId, ['owner', 'partner'])
  if (!ctx) return
  if (!auth.requireStepUp(c, ctx.userId)) return

  var before = { status: period.getString('status'), progress: period.get('progress') }
  period.set('status', 'aberto')
  period.set('progress', 0)
  period.set('reopened_at', new Date().toISOString())
  period.set('closed_at', null)
  $app.save(period)
  // Recalculate progress/status/streak/achievements (FR-017).
  engine.recalculateGoals($app, spaceId, ctx.userId)
  audit.writeAudit($app, {
    space: spaceId,
    actor: ctx.userId,
    action: 'goal.period.reopen',
    entity: 'goal_periods',
    entityId: period.id,
    before: before,
    after: { status: 'aberto' },
  })
  return http.ok(c, period.publicExport())
}

function h_goals_get_api_achievements(c) {
  var spaceId = http.queryParam(c, 'space')
  var ctx = auth.requireSpace($app, c, spaceId)
  if (!ctx) return
  var owner = http.queryParam(c, 'owner') || ctx.userId
  var records = $app.findRecordsByFilter(
    'achievements',
    'space = {:space} && owner = {:owner} && deleted_at = null',
    '-created',
    0,
    0,
    { space: spaceId, owner: owner },
  )
  return http.ok(c, records.map(function (r) {
    return r.publicExport()
  }))
}

// Period closing runs every 15 minutes and closes expired open periods.
function cron_goals() {
  var goals = $app.findRecordsByFilter('goals', 'active = true && deleted_at = null', '', 0, 0, {})
  var seen = {}
  for (var i = 0; i < goals.length; i++) {
    var goal = goals[i]
    var key = goal.getString('space') + ':' + goal.getString('owner')
    if (seen[key]) continue
    seen[key] = true
    engine.recalculateGoals($app, goal.getString('space'), goal.getString('owner'))
  }
  engine.cleanupAchievements($app)
}

// ------------------------------------------------- streak freeze & milestones

function daysAgoISO(days) {
  var d = new Date(Date.now() - days * 86400000)
  return d.toISOString().slice(0, 10)
}

function h_goals_get_api_streaks_status(c) {
  var spaceId = http.queryParam(c, 'space')
  var ctx = auth.requireSpace($app, c, spaceId)
  if (!ctx) return

  var recent = $app.findRecordsByFilter(
    'streak_freezes',
    'space = {:space} && owner = {:owner} && deleted_at = null',
    '-created',
    1,
    0,
    { space: spaceId, owner: ctx.userId },
  )
  var canFreeze = true
  if (recent.length > 0) {
    canFreeze = Date.now() - new Date(recent[0].getString('created')).getTime() >= 7 * 86400000
  }

  var floor = daysAgoISO(3)
  var goals = $app.findRecordsByFilter('goals', 'space = {:space} && owner = {:owner} && deleted_at = null', '', 0, 0, {
    space: spaceId,
    owner: ctx.userId,
  })
  var brokenDate = ''
  for (var g = 0; g < goals.length; g++) {
    var periods = $app.findRecordsByFilter(
      'goal_periods',
      'goal = {:goal} && status = "nao_batida" && deleted_at = null',
      '-end_date',
      5,
      0,
      { goal: goals[g].id },
    )
    for (var p = 0; p < periods.length; p++) {
      var end = String(periods[p].get('end_date')).slice(0, 10)
      if (end >= floor && end > brokenDate) brokenDate = end
    }
  }
  return http.ok(c, { canFreeze: canFreeze, brokenDate: brokenDate })
}

function h_goals_post_api_streaks_freeze(c) {
  var spaceId = http.queryParam(c, 'space')
  var ctx = auth.requireRole($app, c, spaceId, ['owner', 'partner'])
  if (!ctx) return
  var data = body(c)
  var date = String(data.date || '').slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return http.fail(c, 422, 'invalid_date', 'data inválida')

  var recent = $app.findRecordsByFilter(
    'streak_freezes',
    'space = {:space} && owner = {:owner} && deleted_at = null',
    '-created',
    1,
    0,
    { space: spaceId, owner: ctx.userId },
  )
  if (recent.length > 0 && Date.now() - new Date(recent[0].getString('created')).getTime() < 7 * 86400000) {
    return http.fail(c, 429, 'freeze_cooldown', 'Você já usou um congelamento nos últimos 7 dias')
  }

  var collection = $app.findCollectionByNameOrId('streak_freezes')
  var freeze = new Record(collection)
  freeze.set('space', spaceId)
  freeze.set('owner', ctx.userId)
  freeze.set('date', date)
  freeze.set('sync_id', engine.uid())
  $app.save(freeze)

  var goals = $app.findRecordsByFilter('goals', 'space = {:space} && owner = {:owner} && deleted_at = null', '', 0, 0, {
    space: spaceId,
    owner: ctx.userId,
  })
  var protectedCount = 0
  for (var g = 0; g < goals.length; g++) {
    var periods = $app.findRecordsByFilter('goal_periods', 'goal = {:goal} && deleted_at = null', '', 0, 0, { goal: goals[g].id })
    for (var p = 0; p < periods.length; p++) {
      var start = String(periods[p].get('start_date')).slice(0, 10)
      var end = String(periods[p].get('end_date')).slice(0, 10)
      if (date >= start && date <= end && periods[p].getString('status') === 'nao_batida') {
        periods[p].set('status', 'congelado')
        $app.save(periods[p])
        protectedCount += 1
      }
    }
  }

  engine.recalculateGoals($app, spaceId, ctx.userId)
  audit.writeAudit($app, {
    space: spaceId,
    actor: ctx.userId,
    action: 'streak.freeze',
    entity: 'streak_freezes',
    entityId: freeze.id,
  })
  return http.ok(c, { frozen: true, date: date, periods: protectedCount })
}

function h_goals_get_api_milestones(c) {
  var spaceId = http.queryParam(c, 'space')
  var ctx = auth.requireSpace($app, c, spaceId)
  if (!ctx) return
  var records = $app.findRecordsByFilter(
    'milestones',
    'space = {:space} && owner = {:owner} && deleted_at = null',
    '-unlocked_at',
    0,
    0,
    { space: spaceId, owner: ctx.userId },
  )
  return http.ok(c, records.map(function (r) {
    return {
      key: r.getString('key'),
      unlockedAt: r.getString('unlocked_at'),
      payload: http.jsonField(r, 'payload', {}),
    }
  }))
}

// Monthly retrospective push (1st day of the month): queue a notification per user.
function cron_retrospective() {
  var members = $app.findRecordsByFilter('space_members', 'deleted_at = null', '', 0, 0, {})
  var seen = {}
  var collection = $app.findCollectionByNameOrId('notifications')
  var created = 0
  for (var i = 0; i < members.length; i++) {
    var userId = members[i].getString('user')
    if (!userId || seen[userId]) continue
    seen[userId] = true
    var notice = new Record(collection)
    notice.set('user', userId)
    notice.set('actor', userId)
    notice.set('kind', 'retrospective')
    notice.set('body', 'Sua retrospectiva do mês está pronta!')
    notice.set('is_read', false)
    $app.save(notice)
    created += 1
  }
  if (created > 0) http.logStructured('retrospective.queued', { users: created })
}

module.exports = {
  h_goals_get_api_goals: h_goals_get_api_goals,
  h_goals_post_api_goals: h_goals_post_api_goals,
  h_goals_patch_api_goals_id: h_goals_patch_api_goals_id,
  h_goals_delete_api_goals_id: h_goals_delete_api_goals_id,
  h_goals_get_api_goals_id_periods: h_goals_get_api_goals_id_periods,
  h_goals_get_api_goals_id_periods_current: h_goals_get_api_goals_id_periods_current,
  h_goals_post_api_goal_periods_id_reopen: h_goals_post_api_goal_periods_id_reopen,
  h_goals_get_api_achievements: h_goals_get_api_achievements,
  h_goals_get_api_streaks_status: h_goals_get_api_streaks_status,
  h_goals_post_api_streaks_freeze: h_goals_post_api_streaks_freeze,
  h_goals_get_api_milestones: h_goals_get_api_milestones,
  cron_goals: cron_goals,
  cron_retrospective: cron_retrospective,
}
