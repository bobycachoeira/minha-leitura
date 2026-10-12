/// <reference path="../../pb_data/types.d.ts" />
/**
 * T061 — Magic Link tokens: CSPRNG, hashed at rest, single-use, 10–15 min TTL.
 */

var stepup = require(__hooks + '/lib/stepup.js')

var store = {}
var TTL_MS = 15 * 60 * 1000

function create(email) {
  var token = $security.randomString(48)
  var hash = $security.sha256(token)
  store[hash] = { email: email, expiresAt: Date.now() + TTL_MS, used: false }
  return token
}

/** Consumes a token exactly once; returns the email or null. */
function consume(token) {
  if (!token) return null
  var hash = $security.sha256(token)
  var entry = store[hash]
  if (!entry || entry.used || entry.expiresAt < Date.now()) return null
  entry.used = true
  return entry.email
}

/** Verifies a TOTP code during a step-up challenge and returns a token. */
function completeStepUp(userId, code, secret) {
  var totp = require(__hooks + '/lib/totp.js')
  if (!totp.verify(code, secret)) return null
  return stepup.issueStepUp(userId, stepup.stepUpTtl())
}

module.exports = { create: create, consume: consume, completeStepUp: completeStepUp }
