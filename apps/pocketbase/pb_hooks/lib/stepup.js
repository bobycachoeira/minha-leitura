/// <reference path="../../pb_data/types.d.ts" />
/** T063 — short-lived step-up (2FA re-authentication) tokens. */

var store = {}

function issueStepUp(userId, ttlSeconds) {
  var token = $security.randomString(48)
  store[userId] = { token: token, expiresAt: Date.now() + ttlSeconds * 1000 }
  return token
}

function verifyStepUp(userId, token) {
  var entry = store[userId]
  if (!entry || entry.expiresAt < Date.now()) return false
  return entry.token === token
}

function stepUpTtl() {
  var raw = $os.getenv('CF_STEPUP_TTL')
  return raw ? parseInt(raw, 10) : 600
}

module.exports = { issueStepUp: issueStepUp, verifyStepUp: verifyStepUp, stepUpTtl: stepUpTtl }
