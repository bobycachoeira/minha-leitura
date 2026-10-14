import type { PeriodStatus } from '../constants/index.js'
import { diffDays, type ISODate } from './dates.js'

export interface StreakPeriodLike {
  status: PeriodStatus
  startDate: ISODate
  endDate: ISODate
}

/**
 * Counts consecutive `batida` periods ending at the most recent closed period.
 * Open periods are ignored (not yet decided). FR-022 / US5.
 */
export function computeStreak(periods: StreakPeriodLike[]): number {
  const closed = periods
    .filter((p) => p.status !== 'aberto')
    .sort((a, b) => (a.endDate < b.endDate ? 1 : a.endDate > b.endDate ? -1 : 0))

  let streak = 0
  for (const period of closed) {
    if (period.status === 'batida') streak += 1
    else if (period.status === 'congelado') continue // protected day: keeps the sequence
    else break
  }
  return streak
}

export interface DayStreak {
  current: number
  best: number
}

/**
 * Counts consecutive calendar days with at least one reading log.
 * `current` counts the run that ends today or yesterday (an older run is
 * considered broken, but the user can still read today to extend it);
 * `best` is the all-time record. Duplicate dates are ignored.
 */
export function computeDayStreak(dates: ISODate[], today: ISODate): DayStreak {
  const unique = [...new Set(dates)].sort()
  let best = 0
  let run = 0
  let previous: ISODate | null = null
  for (const day of unique) {
    run = previous !== null && diffDays(previous, day) === 1 ? run + 1 : 1
    if (run > best) best = run
    previous = day
  }
  const last = unique[unique.length - 1]
  const lag = last === undefined ? -1 : diffDays(last, today)
  return { current: lag === 0 || lag === 1 ? run : 0, best }
}
