import {
  DEFAULT_GRACE_HOURS,
  DEFAULT_TIMEZONE,
  type GoalPeriodUnit,
} from '../constants/index.js'
import {
  addDaysISO,
  endOfMonthISO,
  startOfMonthISO,
  startOfWeekISO,
  zonedWallTimeToUTC,
  type ISODate,
} from './dates.js'

/** Declarative goal scheduling inputs relevant to period resolution. */
export interface GoalSchedule {
  period: GoalPeriodUnit
  /** 0=domingo..6=sábado; used when `period` is `semana`. */
  weekStart: number
  graceHours: number
  /** Start of the goal's validity; periods do not precede it. */
  startsOn?: ISODate
}

export interface PeriodBounds {
  startDate: ISODate
  endDate: ISODate
  /** UTC ISO instant when the grace window expires. */
  graceUntil: string
}

export interface StartDayChange {
  newWeekStart: number
  /** Only periods starting on/after this business date use `newWeekStart` (FR-035). */
  effectiveFrom: ISODate
}

function computeGraceUntil(endDate: ISODate, graceHours: number, tz: string): string {
  const base = new Date(zonedWallTimeToUTC(endDate, '23:59:59', tz))
  return new Date(base.getTime() + graceHours * 3_600_000).toISOString()
}

/**
 * Resolves the period that contains `reference` for the given schedule.
 * All boundaries are business dates in `tz`; `graceUntil` is a UTC instant.
 */
export function resolvePeriod(
  schedule: GoalSchedule,
  reference: ISODate,
  tz: string = DEFAULT_TIMEZONE,
): PeriodBounds {
  const graceHours = schedule.graceHours ?? DEFAULT_GRACE_HOURS
  let startDate: ISODate
  let endDate: ISODate

  switch (schedule.period) {
    case 'dia':
      startDate = reference
      endDate = reference
      break
    case 'semana':
      startDate = startOfWeekISO(reference, schedule.weekStart)
      endDate = addDaysISO(startDate, 6)
      break
    case 'mes':
      startDate = startOfMonthISO(reference)
      endDate = endOfMonthISO(reference)
      break
  }

  return {
    startDate,
    endDate,
    graceUntil: computeGraceUntil(endDate, graceHours, tz),
  }
}

/**
 * Applies a `week_start` change to a schedule **only from the next period**
 * (FR-035). Periods that start before `change.effectiveFrom` keep the original
 * `weekStart`, so past/open periods are never re-bucketed.
 */
export function resolveScheduleForPeriod(
  schedule: GoalSchedule,
  change: StartDayChange | null,
  periodStart: ISODate,
): GoalSchedule {
  if (!change || periodStart < change.effectiveFrom) return schedule
  return { ...schedule, weekStart: change.newWeekStart }
}

/** True when the grace window has not yet elapsed for `bounds`. */
export function isWithinGrace(bounds: PeriodBounds, now: Date = new Date()): boolean {
  return now.getTime() <= new Date(bounds.graceUntil).getTime()
}
