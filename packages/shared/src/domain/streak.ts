import type { PeriodStatus } from '../constants/index.js'
import type { ISODate } from './dates.js'

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
    else break
  }
  return streak
}
