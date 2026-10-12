/// <reference path="../../pb_data/types.d.ts" />
/** T062 — e-mail delivery. Falls back to logging the message in dev. */

/**
 * Applies SMTP settings from environment variables (docker/.env.tunnel) into the
 * PocketBase app settings on boot, so the mail client can actually send. No-op
 * when CF_MAIL_HOST is empty (dev mode: only logs).
 */
function configure(app) {
  var host = $os.getenv('CF_MAIL_HOST')
  if (!host) return
  try {
    var settings = app.settings()
    settings.smtp.enabled = true
    settings.smtp.host = host
    settings.smtp.port = parseInt($os.getenv('CF_MAIL_PORT') || '587', 10)
    settings.smtp.username = $os.getenv('CF_MAIL_USER') || ''
    settings.smtp.password = $os.getenv('CF_MAIL_PASS') || ''
    settings.smtp.tls = ($os.getenv('CF_MAIL_TLS') || 'true') !== 'false'
    settings.smtp.authMethod = ''
    app.save(settings)
    console.log(JSON.stringify({ event: 'mailer.configured', host: host, port: settings.smtp.port }))
  } catch (err) {
    console.log(JSON.stringify({ event: 'mailer.configure_failed', error: String(err) }))
  }
}

function send(app, to, subject, html) {
  var host = $os.getenv('CF_MAIL_HOST')
  if (!host) {
    console.log('[mailer/dev] to=' + to + ' subject=' + subject)
    return
  }
  var message = new MailerMessage({
    from: { address: $os.getenv('CF_MAIL_FROM') || 'no-reply@minha-leitura.test' },
    to: [{ address: to }],
    subject: subject,
    html: html,
  })
  app.newMailClient().send(message)
}

module.exports = { send: send, configure: configure }
