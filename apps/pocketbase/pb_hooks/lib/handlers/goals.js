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

module.exports = {
  h_goals_get_api_goals: h_goals_get_api_goals,
  h_goals_post_api_goals: h_goals_post_api_goals,
  h_goals_patch_api_goals_id: h_goals_patch_api_goals_id,
  h_goals_delete_api_goals_id: h_goals_delete_api_goals_id,
  h_goals_get_api_goals_id_periods: h_goals_get_api_goals_id_periods,
  h_goals_get_api_goals_id_periods_current: h_goals_get_api_goals_id_periods_current,
  h_goals_post_api_goal_periods_id_reopen: h_goals_post_api_goal_periods_id_reopen,
  h_goals_get_api_achievements: h_goals_get_api_achievements,
  cron_goals: cron_goals
}
