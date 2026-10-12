/// <reference path="../../pb_data/types.d.ts" />
/**
 * US1 — spaces, membership and invites with RBAC. Sensitive actions (invite,
 * role change, member removal) require step-up 2FA (Constitution I).
 */

var http = require(__hooks + '/lib/http.js')
var auth = require(__hooks + '/lib/auth.js')
var audit = require(__hooks + '/lib/audit.js')
var ratelimit = require(__hooks + '/lib/ratelimit.js')

function body(c) {
  return http.requestBody(c) || {}
}

function uid() {
  return $security.randomString(15)
}

function h_space_get_api_spaces(c) {
  var userId = auth.requireAuth(c)
  if (!userId) return
  var memberships = $app.findRecordsByFilter(
    'space_members',
    'user = {:user} && deleted_at = null',
    '',
    0,
    0,
    { user: userId },
  )
  var spaces = []
  for (var i = 0; i < memberships.length; i++) {
    try {
      spaces.push($app.findRecordById('spaces', memberships[i].getString('space')).publicExport())
    } catch (e) {
      /* skip orphaned membership */
    }
  }
  return http.ok(c, spaces)
}

function h_space_post_api_spaces(c) {
  var userId = auth.requireAuth(c)
  if (!userId) return
  var data = body(c)
  if (!data.name) return http.fail(c, 422, 'invalid_name', 'nome do espaço é obrigatório')

  var spaceCollection = $app.findCollectionByNameOrId('spaces')
  var space = new Record(spaceCollection)
  space.set('name', data.name)
  space.set('settings', {})
  space.set('created_by', userId)
  space.set('sync_id', uid())
  $app.save(space)

  var memberCollection = $app.findCollectionByNameOrId('space_members')
  var member = new Record(memberCollection)
  member.set('space', space.id)
  member.set('user', userId)
  member.set('role', 'owner')
  member.set('invite_status', 'accepted')
  member.set('joined_at', new Date().toISOString())
  member.set('sync_id', uid())
  $app.save(member)

  audit.writeAudit($app, { space: space.id, actor: userId, action: 'space.create' })
  return http.ok(c, space.publicExport(), 201)
}

function h_space_get_api_spaces_id_members(c) {
  var spaceId = http.pathParam(c, 'id')
  var ctx = auth.requireSpace($app, c, spaceId)
  if (!ctx) return
  var members = $app.findRecordsByFilter(
    'space_members',
    'space = {:space} && deleted_at = null',
    'created',
    0,
    0,
    { space: spaceId },
  )
  return http.ok(c, members.map(function (m) {
    var memberId = m.getString('user')
    var display = memberId
    try {
      var u = $app.findRecordById('users', memberId)
      display = u.getString('name') || u.getString('email') || memberId
    } catch (e) {
      /* user record missing: fall back to id */
    }
    return { id: m.id, user: memberId, name: display, role: m.getString('role'), isSelf: memberId === ctx.userId }
  }))
}

function h_space_post_api_spaces_id_invites(c) {
  var spaceId = http.pathParam(c, 'id')
  var ctx = auth.requireRole($app, c, spaceId, ['owner', 'partner'])
  if (!ctx) return
  if (!auth.requireStepUp(c, ctx.userId)) return

  var limit = ratelimit.invite(ctx.userId)
  if (!limit.allowed) return http.fail(c, 429, 'rate_limited', 'Muitos convites; aguarde')

  var data = body(c)
  if (!data.email) return http.fail(c, 422, 'invalid_email', 'e-mail do convidado é obrigatório')
  var role = data.role === 'viewer' ? 'viewer' : 'partner'

  var token = $security.randomString(48)
  var collection = $app.findCollectionByNameOrId('invites')
  var invite = new Record(collection)
  invite.set('space', spaceId)
  invite.set('role', role)
  invite.set('email_invited', data.email)
  invite.set('token_hash', $security.sha256(token))
  invite.set('expires_at', new Date(Date.now() + 30 * 60 * 1000).toISOString())
  invite.set('single_use', true)
  $app.save(invite)

  audit.writeAudit($app, { space: spaceId, actor: ctx.userId, action: 'member.invite', entity: 'invites', entityId: invite.id })
  return http.ok(c, { inviteId: invite.id, token: token }, 201)
}

function h_space_post_api_invites_accept(c) {
  var userId = auth.requireAuth(c)
  if (!userId) return
  var data = body(c)
  if (!data.token) return http.fail(c, 422, 'invalid_token', 'token do convite é obrigatório')

  var hash = $security.sha256(data.token)
  var invite = null
  try {
    invite = $app.findFirstRecordByFilter('invites', 'token_hash = {:hash} && used_at = null', { hash: hash })
  } catch (e) {
    return http.fail(c, 404, 'invite_not_found', 'Convite inválido ou já usado')
  }
  if (new Date(invite.getString('expires_at')).getTime() < Date.now()) {
    return http.fail(c, 410, 'invite_expired', 'Convite expirado')
  }

  var spaceId = invite.getString('space')
  var existing = auth.requireSpaceForUser($app, spaceId, userId)
  if (!existing) {
    var memberCollection = $app.findCollectionByNameOrId('space_members')
    var member = new Record(memberCollection)
    member.set('space', spaceId)
    member.set('user', userId)
    member.set('role', invite.getString('role'))
    member.set('invite_status', 'accepted')
    member.set('joined_at', new Date().toISOString())
    member.set('sync_id', uid())
    $app.save(member)
  }

  invite.set('used_at', new Date().toISOString())
  invite.set('used_by', userId)
  $app.save(invite)
  audit.writeAudit($app, { space: spaceId, actor: userId, action: 'member.accept' })
  return http.ok(c, { spaceId: spaceId })
}

function h_space_patch_api_spaces_id_members_userId(c) {
  var spaceId = http.pathParam(c, 'id')
  var ctx = auth.requireRole($app, c, spaceId, ['owner'])
  if (!ctx) return
  if (!auth.requireStepUp(c, ctx.userId)) return
  var data = body(c)
  var target = http.pathParam(c, 'userId')
  var member = auth.requireSpaceForUser($app, spaceId, target)
  if (!member) return http.fail(c, 404, 'member_not_found', 'Membro não encontrado')
  var record = $app.findFirstRecordByFilter(
    'space_members',
    'space = {:space} && user = {:user} && deleted_at = null',
    { space: spaceId, user: target },
  )
  var before = record.getString('role')
  record.set('role', data.role === 'viewer' ? 'viewer' : data.role === 'partner' ? 'partner' : 'owner')
  $app.save(record)
  audit.writeAudit($app, {
    space: spaceId,
    actor: ctx.userId,
    action: 'member.role_change',
    entity: 'space_members',
    entityId: record.id,
    before: { role: before },
    after: { role: record.getString('role') },
  })
  return http.ok(c, record.publicExport())
}

module.exports = {
  h_space_get_api_spaces: h_space_get_api_spaces,
  h_space_post_api_spaces: h_space_post_api_spaces,
  h_space_get_api_spaces_id_members: h_space_get_api_spaces_id_members,
  h_space_post_api_spaces_id_invites: h_space_post_api_spaces_id_invites,
  h_space_post_api_invites_accept: h_space_post_api_invites_accept,
  h_space_patch_api_spaces_id_members_userId: h_space_patch_api_spaces_id_members_userId
}
