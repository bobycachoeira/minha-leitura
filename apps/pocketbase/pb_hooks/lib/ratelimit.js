/// <reference path="../../pb_data/types.d.ts" />
/**
 * T040 — rate limiting (in-memory, per runtime instance).
 * Buckets: magic-link 5/15min, 2FA 5/10min, convite 10/dia, sync 60/min.
 */

var buckets = {}

function check(bucket, key, limit, windowMs) {
  var now = Date.now()
  var full = bucket + ':' + key
  var entry = buckets[full]
  if (!entry || now - entry.start >= windowMs) {
    entry = { start: now, count: 0 }
  }
  entry.count += 1
  buckets[full] = entry
  var allowed = entry.count <= limit
  return { allowed: allowed, remaining: Math.max(0, limit - entry.count), retryAfterMs: windowMs - (now - entry.start) }
}

module.exports = {
  check: check,
  magicLink: function (key) {
    return check('magic_link', key, 5, 15 * 60 * 1000)
  },
  twofa: function (key) {
    return check('twofa', key, 5, 10 * 60 * 1000)
  },
  invite: function (key) {
    return check('invite', key, 10, 24 * 60 * 60 * 1000)
  },
  sync: function (key) {
    return check('sync', key, 60, 60 * 1000)
  },
}
