// Web Push (VAPID) sender. Delivers social notifications (likes/comments/
// follows/feed/period) plus smart reminders and nudges, respecting each user's
// notification_preferences.

const PB_URL = process.env.PB_URL ?? 'http://127.0.0.1:8090'
const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY ?? ''
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY ?? ''
const VAPID_SUBJECT = process.env.VAPID_SUBJECT ?? 'mailto:no-reply@minha-leitura.test'
const INTERVAL_MS = Number(process.env.NOTIFIER_INTERVAL_MS ?? 60 * 1000)
const TZ = process.env.CF_TIMEZONE ?? 'America/Sao_Paulo'

function log(event, fields) {
  console.log(JSON.stringify({ event, at: new Date().toISOString(), ...fields }))
}

/** Local date/time in the configured timezone. */
function nowInTz() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date())
  const get = (type) => parts.find((p) => p.type === type)?.value ?? '00'
  return { date: `${get('year')}-${get('month')}-${get('day')}`, time: `${get('hour')}:${get('minute')}` }
}

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

async function listRecords(token, collection, filter) {
  const query = filter ? `?perPage=500&filter=${encodeURIComponent(filter)}` : '?perPage=500'
  const res = await fetch(`${PB_URL}/api/collections/${collection}/records${query}`, {
    headers: { Authorization: token },
  })
  if (!res.ok) return []
  const data = await res.json()
  return data.items ?? []
}

async function fetchUnpushed(token) {
  return listRecords(token, 'notifications', 'pushed_at = ""')
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

async function sendTo(prefs, payload, webpush) {
  let sent = 0
  for (const subscription of prefs.subscriptions ?? []) {
    try {
      await webpush.sendNotification(subscription, JSON.stringify(payload))
      sent += 1
    } catch (error) {
      log('notifier.send_failed', { message: String(error) })
    }
  }
  return sent
}

// ---------------------------------------------------------------- events

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
  if (kind === 'milestone') return { title, body: body || 'Você desbloqueou uma conquista!', url: '/achievements' }
  if (kind === 'retrospective') return { title, body: body || 'Sua retrospectiva está pronta!', url: '/retrospective' }
  if (kind === 'test') return { title, body: 'Tudo pronto! Você receberá as notificações.', url: '/' }
  return { title, body: `${actor} interagiu com você`, url: '/' }
}

async function deliverEvents(token, webpush, prefsByUser) {
  const notifications = await fetchUnpushed(token)
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
      sent += await sendTo(prefs, payloadFor(n.kind, actor, n.body), webpush)
    }
    await markPushed(token, n.id)
  }
  if (notifications.length > 0) log('notifier.events', { total: notifications.length, sent, skipped })
}

async function markPushed(token, id) {
  await fetch(`${PB_URL}/api/collections/notifications/records/${id}`, {
    method: 'PATCH',
    headers: { Authorization: token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ pushed_at: new Date().toISOString() }),
  })
}

// ------------------------------------------------------- reminders/nudges

const sentKeys = new Set()
let lastDay = ''

function resetDay(date) {
  if (date !== lastDay) {
    sentKeys.clear()
    lastDay = date
  }
}

/** Daily reminder at the user's chosen time, only if they didn't read (smart). */
async function deliverReminders(token, webpush, prefsList, loggedToday) {
  const { date, time } = nowInTz()
  let sent = 0
  for (const prefs of prefsList) {
    if (prefs.goal_reminders === false) continue
    if ((prefs.subscriptions ?? []).length === 0) continue
    const target = prefs.reminder_time || '23:00'
    if (time < target) continue
    const key = `reminder:${prefs.user}`
    if (sentKeys.has(key)) continue
    if (prefs.smart_reminders !== false && loggedToday.has(prefs.user)) {
      sentKeys.add(key)
      continue
    }
    sent += await sendTo(
      prefs,
      { title: 'Minha Leitura', body: 'Não esqueça de registrar sua leitura de hoje 📚', url: '/' },
      webpush,
    )
    sentKeys.add(key)
  }
  if (sent > 0) log('notifier.reminders', { date, time, sent })
}

/** "Your partner read today — and you?" (once a day, after 18:00). */
async function deliverPartnerNudges(token, webpush, prefsList, loggedToday, members) {
  const { time } = nowInTz()
  if (time < '18:00') return
  const nameCache = new Map()
  let sent = 0
  for (const prefs of prefsList) {
    if (prefs.partner_nudges === false) continue
    if ((prefs.subscriptions ?? []).length === 0) continue
    const key = `partner:${prefs.user}`
    if (sentKeys.has(key)) continue
    if (loggedToday.has(prefs.user)) continue
    const partners = members.filter((m) => m.space === prefs.space && m.user !== prefs.user)
    const reader = partners.find((m) => loggedToday.has(m.user))
    if (!reader) continue
    const name = await fetchUserName(token, reader.user, nameCache)
    sent += await sendTo(
      prefs,
      { title: 'Minha Leitura', body: `${name} leu hoje — e você? 📖`, url: '/' },
      webpush,
    )
    sentKeys.add(key)
  }
  if (sent > 0) log('notifier.partner_nudges', { sent })
}

/** "You're X away from your goal" (once per period, after 12:00). */
async function deliverNearGoal(token, webpush, prefsList, periods) {
  const { time } = nowInTz()
  if (time < '12:00') return
  let sent = 0
  for (const prefs of prefsList) {
    if (prefs.near_goal_nudges === false) continue
    if ((prefs.subscriptions ?? []).length === 0) continue
    for (const period of periods) {
      if (period.owner !== prefs.user) continue
      const target = Number(period.target ?? 0)
      const progress = Number(period.progress ?? 0)
      if (target <= 0 || progress >= target) continue
      if (progress / target < 0.7) continue
      const key = `neargoal:${period.id}`
      if (sentKeys.has(key)) continue
      const left = target - progress
      sent += await sendTo(
        prefs,
        { title: 'Minha Leitura', body: `Faltam ${left} para bater sua meta! 💪`, url: '/goals' },
        webpush,
      )
      sentKeys.add(key)
    }
  }
  if (sent > 0) log('notifier.near_goal', { sent })
}

// ---------------------------------------------------------------- tick

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

  const { date } = nowInTz()
  resetDay(date)

  const prefsList = await listRecords(token, 'notification_preferences', '')
  const prefsByUser = new Map(prefsList.map((p) => [p.user, p]))

  await deliverEvents(token, webpush, prefsByUser)

  const needsToday =
    prefsList.some((p) => p.goal_reminders !== false || p.partner_nudges !== false)
  const todayLogs = needsToday
    ? await listRecords(token, 'reading_logs', `date >= "${date} 00:00:00.000Z"`)
    : []
  const loggedToday = new Set(todayLogs.map((l) => l.owner))

  const needsMembers = prefsList.some((p) => p.partner_nudges !== false)
  const members = needsMembers ? await listRecords(token, 'space_members', '') : []

  const needsPeriods = prefsList.some((p) => p.near_goal_nudges !== false)
  const periods = needsPeriods ? await listRecords(token, 'goal_periods', 'status = "aberto"') : []

  await deliverReminders(token, webpush, prefsList, loggedToday)
  await deliverPartnerNudges(token, webpush, prefsList, loggedToday, members)
  await deliverNearGoal(token, webpush, prefsList, periods)
}

log('notifier.start', { intervalMs: INTERVAL_MS, tz: TZ })
setInterval(() => {
  void tick()
}, INTERVAL_MS)
void tick()
