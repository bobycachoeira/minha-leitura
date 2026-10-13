/// <reference path="../../pb_data/types.d.ts" />
/**
 * US1 — secure access: Magic Link, TOTP 2FA step-up and session endpoints.
 * Rate limiting and 2FA are enforced server-side (Constitution I).
 */

var http = require(__hooks + '/lib/http.js')
var auth = require(__hooks + '/lib/auth.js')
var ratelimit = require(__hooks + '/lib/ratelimit.js')
var magicLink = require(__hooks + '/lib/magic-link.js')
var mailer = require(__hooks + '/lib/mailer.js')
var totp = require(__hooks + '/lib/totp.js')
var crypto = require(__hooks + '/lib/crypto.js')
var audit = require(__hooks + '/lib/audit.js')
var stepup = require(__hooks + '/lib/stepup.js')

function body(c) {
  return http.requestBody(c) || {}
}

/**
 * Provisions the account on first Magic Link when the email is the bootstrap
 * admin (CF_ADMIN_EMAIL) or has a pending invite (couple onboarding).
 */
function ensureUser(email) {
  try {
    $app.findAuthRecordByEmail('users', email)
    return
  } catch (e) {
    // not found — maybe create below
  }
  var adminEmail = ($os.getenv('CF_ADMIN_EMAIL') || '').toLowerCase().trim()
  var isAdmin = adminEmail !== '' && email === adminEmail
  var hasInvite = false
  try {
    $app.findFirstRecordByFilter('invites', 'email_invited = {:email} && used_at = null', { email: email })
    hasInvite = true
  } catch (e2) {
    hasInvite = false
  }
  if (!isAdmin && !hasInvite) return
  var collection = $app.findCollectionByNameOrId('users')
  var user = new Record(collection)
  user.set('email', email)
  user.set('name', isAdmin ? $os.getenv('CF_ADMIN_NAME') || 'Titular' : email.split('@')[0] || 'Leitor(a)')
  user.set('active', true)
  user.setPassword($security.randomString(32))
  $app.save(user)
  http.logStructured('auth.user_created', { email: email, invited: hasInvite })
}

function requestMagicLinkHandler(c) {
  var data = body(c)
  var email = (data.email || '').toLowerCase().trim()
  if (!email) return http.fail(c, 422, 'invalid_email', 'informe um e-mail')

  var limit = ratelimit.magicLink(email)
  if (!limit.allowed) return http.fail(c, 429, 'rate_limited', 'Muitas solicitações; aguarde')

  ensureUser(email)
  var token = magicLink.create(email)
  var appUrl = $os.getenv('CF_APP_URL') || 'http://localhost:5173'
  var link = appUrl + '/login?token=' + token
  // Dev convenience: log the link so you can grab it from container logs.
  http.logStructured('MAGIC_LINK', { email: email, link: link })
  try {
    mailer.send(
      $app,
      email,
      'Seu acesso ao Minha Leitura',
      '<p>Use este link único (expira em 15 minutos): <a href="' + link + '">Entrar</a></p>',
    )
  } catch (err) {
    http.logStructured('magic_link.mail_failed', { error: String(err) })
  }
  // Never reveal whether the e-mail exists, and never return the link.
  return http.ok(c, { sent: true })
}

function verifyMagicLinkHandler(c) {
  var data = body(c)
  var email = magicLink.consume(data.token)
  if (!email) return http.fail(c, 401, 'invalid_token', 'Link inválido ou expirado')

  var user = null
  try {
    user = $app.findAuthRecordByEmail('users', email)
  } catch (err) {
    return http.fail(c, 404, 'user_not_found', 'Usuário não encontrado')
  }

  var deviceId = data.deviceId || ''
  if (user.getBool('twofa_enabled') && !isTrustedDevice(user, deviceId)) {
    user.set('last_known_device', deviceId)
    $app.save(user)
    return http.ok(c, { stepUpRequired: true, userId: user.id })
  }

  user.set('last_login_at', new Date().toISOString())
  $app.save(user)
  return $apis.recordAuthResponse(c, user)
}

function isTrustedDevice(user, deviceId) {
  if (!deviceId) return false
  var devices = user.get('trusted_devices') || []
  for (var i = 0; i < devices.length; i++) {
    if (devices[i].id === deviceId) return true
  }
  return false
}

function setup2faHandler(c) {
  var userId = auth.requireAuth(c)
  if (!userId) return
  var user = $app.findRecordById('users', userId)
  var secret = totp.generateSecret()
  user.set('twofa_secret_encrypted', crypto.encryptSecret(secret))
  user.set('twofa_setup_completed', false)
  $app.save(user)
  var issuer = encodeURIComponent('Minha Leitura')
  var label = encodeURIComponent(user.email())
  var otpauth = 'otpauth://totp/' + label + '?secret=' + secret + '&issuer=' + issuer + '&algorithm=SHA1&digits=6&period=30'
  return http.ok(c, { secret: secret, otpauthUrl: otpauth })
}

function confirm2faHandler(c) {
  var userId = auth.requireAuth(c)
  if (!userId) return
  var data = body(c)
  var user = $app.findRecordById('users', userId)
  var secret = crypto.decryptSecret(user.getString('twofa_secret_encrypted'))
  if (!totp.verify(data.code, secret)) {
    return http.fail(c, 401, 'invalid_code', 'Código TOTP inválido')
  }
  var codes = []
  for (var i = 0; i < 10; i++) codes.push($security.randomString(10))
  user.set('twofa_enabled', true)
  user.set('twofa_setup_completed', true)
  user.set('recovery_codes_hashed', codes.map(function (code) {
    return $security.sha256(code)
  }))
  $app.save(user)
  audit.writeAudit($app, { space: user.get('last_known_device') || '', actor: userId, action: 'auth.2fa.enable' })
  return http.ok(c, { recoveryCodes: codes })
}

function verify2faHandler(c) {
  var data = body(c)
  var userId = data.userId
  if (!userId) return http.fail(c, 422, 'user_required', 'userId é obrigatório')
  var limit = ratelimit.twofa(userId)
  if (!limit.allowed) return http.fail(c, 429, 'rate_limited', 'Muitas tentativas; aguarde')

  var user = null
  try {
    user = $app.findRecordById('users', userId)
  } catch (err) {
    return http.fail(c, 404, 'user_not_found', 'Usuário não encontrado')
  }
  var secret = crypto.decryptSecret(user.getString('twofa_secret_encrypted'))
  if (!totp.verify(data.code, secret)) {
    return http.fail(c, 401, 'invalid_code', 'Código TOTP inválido')
  }
  var token = auth.issueStepUp(userId, stepup.stepUpTtl())
  user.set('last_login_at', new Date().toISOString())
  $app.save(user)
  // Issue the session token and expose the step-up token in `meta`.
  return $apis.recordAuthResponse(c, user, 'totp', { stepUpToken: token })
}

function meHandler(c) {
  var userId = auth.requireAuth(c)
  if (!userId) return
  var user = $app.findRecordById('users', userId)
  return http.ok(c, {
    id: user.id,
    email: user.email(),
    name: user.getString('name'),
    bio: user.getString('bio'),
    avatar: user.getString('avatar_data'),
    twofaEnabled: user.getBool('twofa_enabled'),
    currentBook: user.getString('current_book'),
  })
}

function updateMeHandler(c) {
  var userId = auth.requireAuth(c)
  if (!userId) return
  var data = http.requestBody(c)
  var user = $app.findRecordById('users', userId)
  if (data.name !== undefined) {
    var name = String(data.name).trim()
    if (name.length < 1 || name.length > 80) {
      return http.fail(c, 422, 'invalid_name', 'nome deve ter 1 a 80 caracteres')
    }
    user.set('name', name)
  }
  if (data.bio !== undefined) {
    var bio = String(data.bio)
    if (bio.length > 280) return http.fail(c, 422, 'invalid_bio', 'bio deve ter até 280 caracteres')
    user.set('bio', bio)
  }
  if (data.avatarData !== undefined) {
    var avatar = String(data.avatarData || '')
    if (avatar.length > 400000) return http.fail(c, 413, 'avatar_too_large', 'foto muito grande')
    user.set('avatar_data', avatar)
  }
  if (data.currentBook !== undefined) {
    user.set('current_book', String(data.currentBook || '').slice(0, 20))
  }
  $app.save(user)
  return http.ok(c, {
    id: user.id,
    email: user.email(),
    name: user.getString('name'),
    bio: user.getString('bio'),
    avatar: user.getString('avatar_data'),
    currentBook: user.getString('current_book'),
  })
}

function h_auth_post_api_auth_logout(c) {
  return http.ok(c, { ok: true })
}

module.exports = {
  requestMagicLinkHandler: requestMagicLinkHandler,
  verifyMagicLinkHandler: verifyMagicLinkHandler,
  setup2faHandler: setup2faHandler,
  confirm2faHandler: confirm2faHandler,
  verify2faHandler: verify2faHandler,
  meHandler: meHandler,
  updateMeHandler: updateMeHandler,
  h_auth_post_api_auth_logout: h_auth_post_api_auth_logout
}
