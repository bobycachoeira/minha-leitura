// Web Push (VAPID) sender. Delivers social notifications (likes/comments/
// follows/feed/period) and a daily goal reminder, respecting each user's
// notification_preferences.

const PB_URL = process.env.PB_URL ?? 'http://127.0.0.1:8090'
const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY ?? ''
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY ?? ''
const VAPID_SUBJECT = process.env.VAPID_SUBJECT ?? 'mailto:no-reply@minha-leitura.test'
const INTERVAL_MS = Number(process.env.NOTIFIER_INTERVAL_MS ?? 60 * 1000)
const REMINDER_INTERVAL_MS = Number(process.env.NOTIFIER_REMINDER_MS ?? 24 * 60 * 60 * 1000)

function log(event, fields) {
  console.log(JSON.stringify({ event, at: new Date().toISOString(), ...fields }))
}

let lastReminderAt = Date.now()

async function adminToken() {
  const email = process.env.PB_ADMIN_EMAIL
  const password = process.env.PB_ADMIN_PASSWORD
  if (!email || !password) return null
  const authVia = process.env.PB_ADMIN_AUTH_VIA ?? '_superusers'
  const res = await fetch(`${PB_URL}/api/collections/${authVia}/auth-with-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: email, password }),
  })
  if (!res.ok) return null
  const data = await res.json()
  return data.token ?? null
}

async function fetchPrefs(token) {
  const res = await fetch(`${PB_URL}/api/collections/notification_preferences/records?perPage=500`, {
    headers: { Authorization: token },
  })
  if (!res.ok) return []
  const data = await res.json()
  return data.items ?? []
}

async function fetchUnpushed(token) {
  const filter = encodeURIComponent('pushed_at = ""')
  const res = await fetch(
    `${PB_URL}/api/collections/notifications/records?perPage=100&sort=-created&filter=${filter}`,
    { headers: { Authorization: token } },
  )
  if (!res.ok) return []
  const data = await res.json()
  return data.items ?? []
}

async function fetchUserName(token, id, cache) {
  if (cache.has(id)) return cache.get(id)
  let name = 'Alguém'
  try {
    const res = await fetch(`${PB_URL}/api/collections/users/records/${id}`, {
      headers: { Authorization: token },
    })
    if (res.ok) {
      const u = await res.json()
      name = u.name || u.email || name
    }
  } catch {
    // ignore
  }
  cache.set(id, name)
  return name
}

function prefKeyFor(kind) {
  if (kind === 'like') return 'likes'
  if (kind === 'comment') return 'comments'
  if (kind === 'follow') return 'follows'
  if (kind === 'post') return 'feed'
  if (kind === 'period') return 'period_close_reminders'
  return null
}

function payloadFor(kind, actor, body) {
  const title = 'Minha Leitura'
  if (kind === 'like') return { title, body: `${actor} curtiu sua publicação`, url: '/' }
  if (kind === 'comment') return { title, body: `${actor} comentou: ${body ?? ''}`.slice(0, 140), url: '/' }
  if (kind === 'follow') return { title, body: `${actor} começou a te seguir`, url: '/' }
  if (kind === 'post') return { title, body: `${actor} publicou algo novo`, url: '/' }
  if (kind === 'period') return { title, body: body || 'Seu período de meta fechou', url: '/goals' }
  if (kind === 'test') return { title, body: 'Tudo pronto! Você receberá as notificações.', url: '/' }
  return { title, body: `${actor} interagiu com você`, url: '/' }
}

async function markPushed(token, id) {
  await fetch(`${PB_URL}/api/collections/notifications/records/${id}`, {
    method: 'PATCH',
    headers: { Authorization: token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ pushed_at: new Date().toISOString() }),
  })
}

async function deliverEvents(token, webpush) {
  const [prefsList, notifications] = await Promise.all([fetchPrefs(token), fetchUnpushed(token)])
  const prefsByUser = new Map(prefsList.map((p) => [p.user, p]))
  const nameCache = new Map()
  let sent = 0
  let skipped = 0

  for (const n of notifications) {
    const prefs = prefsByUser.get(n.user)
    const subs = (prefs && prefs.subscriptions) || []
    const prefKey = prefKeyFor(n.kind)
    const enabled = !prefKey || !prefs || prefs[prefKey] !== false

    if (!enabled || subs.length === 0) {
      skipped += 1
    } else {
      const actor = await fetchUserName(token, n.actor, nameCache)
      const payload = JSON.stringify(payloadFor(n.kind, actor, n.body))
      for (const subscription of subs) {
        try {
          await webpush.sendNotification(subscription, payload)
          sent += 1
        } catch (error) {
          log('notifier.send_failed', { message: String(error) })
        }
      }
    }
    await markPushed(token, n.id)
  }
  if (notifications.length > 0) log('notifier.events', { total: notifications.length, sent, skipped })
}

async function sendDailyReminder(token, webpush) {
  const prefsList = await fetchPrefs(token)
  const payload = JSON.stringify({
    title: 'Minha Leitura',
    body: 'Não esqueça de registrar sua leitura de hoje 📚',
    url: '/',
  })
  let sent = 0
  for (const record of prefsList) {
    if (record.goal_reminders === false) continue
    for (const subscription of record.subscriptions ?? []) {
      try {
        await webpush.sendNotification(subscription, payload)
        sent += 1
      } catch (error) {
        log('notifier.send_failed', { message: String(error) })
      }
    }
  }
  log('notifier.reminder', { sent })
}

async function tick() {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
    log('notifier.skip', { reason: 'missing VAPID keys' })
    return
  }
  const webpush = (await import('web-push')).default
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE)

  const token = await adminToken()
  if (!token) {
    log('notifier.skip', { reason: 'admin auth failed' })
    return
  }

  await deliverEvents(token, webpush)

  if (Date.now() - lastReminderAt >= REMINDER_INTERVAL_MS) {
    await sendDailyReminder(token, webpush)
    lastReminderAt = Date.now()
  }
}

log('notifier.start', { intervalMs: INTERVAL_MS, reminderMs: REMINDER_INTERVAL_MS })
setInterval(() => {
  void tick()
}, INTERVAL_MS)
void tick()
