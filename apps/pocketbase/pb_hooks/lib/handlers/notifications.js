/// <reference path="../../pb_data/types.d.ts" />
/** Per-user notification preferences and Web Push subscriptions (FR-029). */

var http = require(__hooks + '/lib/http.js')
var auth = require(__hooks + '/lib/auth.js')

function body(c) {
  return http.requestBody(c) || {}
}

var FLAGS = [
  'goal_reminders',
  'period_close_reminders',
  'likes',
  'comments',
  'follows',
  'feed',
  'smart_reminders',
  'partner_nudges',
  'near_goal_nudges',
]

function findPrefs(spaceId, userId) {
  try {
    return $app.findFirstRecordByFilter(
      'notification_preferences',
      'space = {:space} && user = {:user}',
      { space: spaceId, user: userId },
    )
  } catch (e) {
    return null
  }
}

/** Normalized preferences (camelCase) — defaults to enabled. */
function exportPrefs(prefs) {
  var out = {}
  for (var i = 0; i < FLAGS.length; i++) {
    var camel = FLAGS[i].replace(/_([a-z])/g, function (_m, ch) {
      return ch.toUpperCase()
    })
    out[camel] = prefs ? prefs.getBool(FLAGS[i]) : true
  }
  out.reminderTime = prefs ? prefs.getString('reminder_time') || '' : ''
  return out
}

function h_notifications_get_api_notification_preferences(c) {
  var spaceId = http.queryParam(c, 'space')
  var ctx = auth.requireSpace($app, c, spaceId)
  if (!ctx) return
  return http.ok(c, exportPrefs(findPrefs(spaceId, ctx.userId)))
}

function h_notifications_put_api_notification_preferences(c) {
  var spaceId = http.queryParam(c, 'space')
  var ctx = auth.requireSpace($app, c, spaceId)
  if (!ctx) return
  var data = body(c)
  var prefs = findPrefs(spaceId, ctx.userId)
  if (!prefs) {
    var collection = $app.findCollectionByNameOrId('notification_preferences')
    prefs = new Record(collection)
    prefs.set('space', spaceId)
    prefs.set('user', ctx.userId)
    // New records default to everything enabled.
    for (var i = 0; i < FLAGS.length; i++) prefs.set(FLAGS[i], true)
  }
  var mapping = {
    goalReminders: 'goal_reminders',
    periodCloseReminders: 'period_close_reminders',
    likes: 'likes',
    comments: 'comments',
    follows: 'follows',
    feed: 'feed',
    smartReminders: 'smart_reminders',
    partnerNudges: 'partner_nudges',
    nearGoalNudges: 'near_goal_nudges',
  }
  for (var key in mapping) {
    if (Object.prototype.hasOwnProperty.call(data, key) && data[key] !== undefined) {
      prefs.set(mapping[key], !!data[key])
    }
  }
  if (typeof data.reminderTime === 'string') prefs.set('reminder_time', data.reminderTime)
  // Subscribing to push means the user wants the reminders (unless toggled off directly).
  if (data.subscription) {
    if (data.goalReminders === undefined) prefs.set('goal_reminders', true)
    var subscriptions = http.jsonField(prefs, 'subscriptions', [])
    if (!Array.isArray(subscriptions)) subscriptions = []
    var endpoint = data.subscription.endpoint
    if (endpoint) {
      subscriptions = subscriptions.filter(function (s) {
        return !s || s.endpoint !== endpoint
      })
    }
    subscriptions.push(data.subscription)
    prefs.set('subscriptions', subscriptions)
  }
  $app.save(prefs)
  return http.ok(c, exportPrefs(prefs))
}

/** Queues a test push for the current user (delivered by the notifier). */
function h_notifications_post_api_notifications_test(c) {
  var spaceId = http.queryParam(c, 'space')
  var ctx = auth.requireSpace($app, c, spaceId)
  if (!ctx) return
  var collection = $app.findCollectionByNameOrId('notifications')
  var record = new Record(collection)
  record.set('user', ctx.userId)
  record.set('actor', ctx.userId)
  record.set('kind', 'test')
  record.set('body', 'Notificação de teste')
  record.set('is_read', true)
  $app.save(record)
  return http.ok(c, { queued: true })
}

module.exports = {
  h_notifications_get_api_notification_preferences: h_notifications_get_api_notification_preferences,
  h_notifications_put_api_notification_preferences: h_notifications_put_api_notification_preferences,
  h_notifications_post_api_notifications_test: h_notifications_post_api_notifications_test,
}
