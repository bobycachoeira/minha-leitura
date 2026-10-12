import { DEFAULT_TIMEZONE } from '../constants/index.js'

/**
 * Date/time helpers for business-calendar math.
 *
 * Business dates are represented as `YYYY-MM-DD` strings in the configured
 * business timezone (`CF_TIMEZONE`). To keep this module usable both in the
 * browser AND inside PocketBase's Goja runtime (which has no `Intl` and no
 * `date-fns-tz`), timezone handling uses fixed UTC offsets.
 *
 * Brazil abolished DST (2019), so `America/Sao_Paulo` and the other Brazilian
 * zones below are stable. Other zones fall back to a parsed `UTC±HH:MM` form or
 * UTC. Calendar math still runs on UTC-midnight `Date` objects so the host
 * machine timezone can never shift a day boundary.
 */

export type ISODate = string

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const MS_PER_MIN = 60_000
const MS_PER_DAY = 86_400_000

/** Fixed offsets (in minutes from UTC) for the zones we support in the backend. */
const TZ_OFFSETS_MIN: Record<string, number> = {
  UTC: 0,
  'Etc/UTC': 0,
  GMT: 0,
  'America/Sao_Paulo': -180,
  'America/Argentina/Buenos_Aires': -180,
  'America/Bahia': -180,
  'America/Fortaleza': -180,
  'America/Recife': -180,
  'America/Belem': -180,
  'America/Manaus': -240,
  'America/Cuiaba': -240,
  'America/Rio_Branco': -300,
}

export function timezoneOffsetMinutes(timezone: string): number {
  const known = TZ_OFFSETS_MIN[timezone]
  if (known !== undefined) return known
  const match = /^UTC([+-])(\d{1,2})(?::?(\d{2}))?$/.exec(timezone)
  if (match) {
    const sign = match[1] === '-' ? -1 : 1
    const hours = parseInt(match[2]!, 10)
    const minutes = match[3] ? parseInt(match[3]!, 10) : 0
    return sign * (hours * 60 + minutes)
  }
  return 0
}

export function isValidISODate(value: unknown): value is ISODate {
  if (typeof value !== 'string' || !ISO_DATE_RE.test(value)) return false
  const d = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(d.getTime()) && formatISO(d) === value
}

/** Parses a business date into a UTC-midnight Date. */
export function parseISODate(value: ISODate): Date {
  return new Date(`${value}T00:00:00.000Z`)
}

/** Formats a UTC-midnight Date back into a business date. */
export function formatISO(date: Date): ISODate {
  return date.toISOString().slice(0, 10)
}

/** Returns "today" (business date) in the given timezone. */
export function todayISODate(
  timezone: string = DEFAULT_TIMEZONE,
  reference: Date = new Date(),
): ISODate {
  const shifted = new Date(reference.getTime() + timezoneOffsetMinutes(timezone) * MS_PER_MIN)
  return formatISO(shifted)
}

/** Adds `days` to an ISO business date. */
export function addDaysISO(value: ISODate, days: number): ISODate {
  const d = parseISODate(value)
  d.setUTCDate(d.getUTCDate() + days)
  return formatISO(d)
}

/** Whole days from `a` to `b` (b - a). */
export function diffDays(a: ISODate, b: ISODate): number {
  return Math.round((parseISODate(b).getTime() - parseISODate(a).getTime()) / MS_PER_DAY)
}

export function minISO(a: ISODate, b: ISODate): ISODate {
  return a <= b ? a : b
}

export function maxISO(a: ISODate, b: ISODate): ISODate {
  return a >= b ? a : b
}

export function isBeforeISO(a: ISODate, b: ISODate): boolean {
  return a < b
}

export function isWithinInclusive(value: ISODate, start: ISODate, end: ISODate): boolean {
  return value >= start && value <= end
}

/** Weekday of an ISO date, 0=Sunday..6=Saturday. */
export function dayOfWeek(value: ISODate): number {
  return parseISODate(value).getUTCDay()
}

/** Inclusive list of ISO dates from `start` to `end`. */
export function eachDayISO(start: ISODate, end: ISODate): ISODate[] {
  const out: ISODate[] = []
  let cur = start
  while (cur <= end) {
    out.push(cur)
    cur = addDaysISO(cur, 1)
  }
  return out
}

/** First day of the week containing `value`, honoring `weekStart` (0=Sunday). */
export function startOfWeekISO(value: ISODate, weekStart: number): ISODate {
  const offset = (dayOfWeek(value) - weekStart + 7) % 7
  return addDaysISO(value, -offset)
}

/** First day of the month containing `value`. */
export function startOfMonthISO(value: ISODate): ISODate {
  return `${value.slice(0, 7)}-01`
}

/** Last day of the month containing `value`. */
export function endOfMonthISO(value: ISODate): ISODate {
  const d = parseISODate(value)
  return formatISO(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)))
}

/**
 * Converts a business wall-clock date + time in `timezone` to a UTC ISO string.
 * Used to compute `grace_until` deterministically.
 */
export function zonedWallTimeToUTC(
  date: ISODate,
  time: string,
  timezone: string = DEFAULT_TIMEZONE,
): string {
  const [y, mo, d] = date.split('-').map((part) => parseInt(part, 10))
  const [h, mi, s] = time.split(':').map((part) => parseInt(part, 10))
  const wallMs = Date.UTC(y!, mo! - 1, d!, h ?? 0, mi ?? 0, s ?? 0)
  return new Date(wallMs - timezoneOffsetMinutes(timezone) * MS_PER_MIN).toISOString()
}

/** Converts a UTC instant to a business ISO date in `timezone`. */
export function utcToBusinessDate(
  instant: Date | string,
  timezone: string = DEFAULT_TIMEZONE,
): ISODate {
  const date = typeof instant === 'string' ? new Date(instant) : instant
  return formatISO(new Date(date.getTime() + timezoneOffsetMinutes(timezone) * MS_PER_MIN))
}

/** Formats a UTC instant in the business timezone (pt-BR friendly, no Intl). */
export function formatInBusinessTimezone(
  instant: Date | string,
  timezone: string = DEFAULT_TIMEZONE,
): string {
  const date = typeof instant === 'string' ? new Date(instant) : instant
  const shifted = new Date(date.getTime() + timezoneOffsetMinutes(timezone) * MS_PER_MIN)
  const iso = shifted.toISOString()
  return `${iso.slice(0, 10)} ${iso.slice(11, 16)}`
}
