/// <reference path="../../pb_data/types.d.ts" />
/**
 * T038 — auth/session/space/RBAC middleware helpers.
 * Space is always derived from the session, never from the request body
 * (Constitution I).
 */

var stepup = require(__hooks + '/lib/stepup.js')
var http = require(__hooks + '/lib/http.js')

function currentUserId(c) {
  var record = http.authRecord(c)
  return record ? record.id : null
}

function requireAuth(c) {
  var userId = currentUserId(c)
  if (!userId) {
    c.json(401, { code: 'unauthorized', message: 'Autenticação obrigatória' })
    return null
  }
  return userId
}

function getMembership(app, spaceId, userId) {
  try {
    return app.findFirstRecordByFilter(
      'space_members',
      'space = {:space} && user = {:user} && deleted_at = null',
      { space: spaceId, user: userId },
    )
  } catch (err) {
    return null
  }
}

function requireSpace(app, c, spaceId) {
  var userId = requireAuth(c)
  if (!userId) return null
  if (!spaceId) {
    c.json(400, { code: 'space_required', message: 'space é obrigatório' })
    return null
  }
  var membership = getMembership(app, spaceId, userId)
  if (!membership) {
    c.json(403, { code: 'forbidden', message: 'Acesso negado a este espaço' })
    return null
  }
  return { userId: userId, role: membership.getString('role') }
}

function requireRole(app, c, spaceId, roles) {
  var ctx = requireSpace(app, c, spaceId)
  if (!ctx) return null
  if (roles.indexOf(ctx.role) === -1) {
    c.json(403, { code: 'forbidden', message: 'Papel insuficiente para esta ação' })
    return null
  }
  return ctx
}

/** Space + user lookup without writing a response (used by sync push). */
function requireSpaceForUser(app, spaceId, userId) {
  var membership = getMembership(app, spaceId, userId)
  return membership ? { userId: userId, role: membership.getString('role') } : null
}

/** Issues a short-lived step-up token after a successful TOTP challenge. */
function issueStepUp(userId, ttlSeconds) {
  return stepup.issueStepUp(userId, ttlSeconds)
}

/** Requires a valid, unexpired step-up token (2FA re-authentication). */
function requireStepUp(c, userId) {
  var header = http.header(c, 'X-Step-Up-Token')
  if (!header || !stepup.verifyStepUp(userId, header)) {
    c.json(403, { code: 'step_up_required', message: 'Reautenticação 2FA necessária' })
    return false
  }
  return true
}

module.exports = {
  currentUserId: currentUserId,
  requireAuth: requireAuth,
  requireSpace: requireSpace,
  requireRole: requireRole,
  requireSpaceForUser: requireSpaceForUser,
  issueStepUp: issueStepUp,
  requireStepUp: requireStepUp,
}
