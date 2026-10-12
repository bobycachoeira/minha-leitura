import {
  DEFAULT_GRACE_HOURS,
  DEFAULT_TIMEZONE,
  type GoalMetric,
  type PeriodStatus,
  type ReadStatus,
} from '../constants/index.js'
import {
  diffDays,
  isWithinInclusive,
  maxISO,
  todayISODate,
  type ISODate,
} from './dates.js'
import { isWithinGrace, type PeriodBounds } from './period.js'

export interface ReadingLogLike {
  date: ISODate
  pages: number
  book?: string
  deletedAt?: string | null
}

export interface UserBookLike {
  status: ReadStatus
  finishedAt?: ISODate | null
  deletedAt?: string | null
}

export interface ComputePeriodProgressInput {
  metric: GoalMetric
  target: number
  period: PeriodBounds
  logs?: ReadingLogLike[]
  books?: UserBookLike[]
  now?: Date
  tz?: string
}

export interface PeriodProgressResult {
  progress: number
  remaining: number
  daysRemaining: number
  status: PeriodStatus
}

/** Sums non-deleted page logs whose business date falls inside the period. */
export function sumPagesInPeriod(logs: ReadingLogLike[], period: PeriodBounds): number {
  return logs
    .filter((log) => !log.deletedAt && isWithinInclusive(log.date, period.startDate, period.endDate))
    .reduce((total, log) => total + Math.max(0, log.pages), 0)
}

/**
 * Counts books that count toward a `livros` goal (FR-036): only books with
 * status `lido` whose `finishedAt` falls inside the period. Abandoned books are
 * never counted, which also removes them from an open period on recalculation.
 */
export function countFinishedBooksInPeriod(books: UserBookLike[], period: PeriodBounds): number {
  return books.filter(
    (book) =>
      !book.deletedAt &&
      book.status === 'lido' &&
      !!book.finishedAt &&
      isWithinInclusive(book.finishedAt, period.startDate, period.endDate),
  ).length
}

export function computePeriodStatus(
  progress: number,
  target: number,
  period: PeriodBounds,
  now: Date = new Date(),
): PeriodStatus {
  if (progress >= target) return 'batida'
  if (!isWithinGrace(period, now)) return 'nao_batida'
  return 'aberto'
}

/** Days remaining in the period (inclusive), counted in the business timezone. */
export function daysRemainingInPeriod(
  period: PeriodBounds,
  now: Date = new Date(),
  tz: string = DEFAULT_TIMEZONE,
): number {
  const today = todayISODate(tz, now)
  if (today > period.endDate) return 0
  const from = maxISO(today, period.startDate)
  return diffDays(from, period.endDate) + 1
}

/**
 * Computes accumulated progress for a period. The period is a budget: days not
 * read are compensated on other days of the same period (Constitution III).
 */
export function computePeriodProgress(input: ComputePeriodProgressInput): PeriodProgressResult {
  const { metric, target, period, logs = [], books = [], now = new Date() } = input
  const progress =
    metric === 'paginas' ? sumPagesInPeriod(logs, period) : countFinishedBooksInPeriod(books, period)

  return {
    progress,
    remaining: Math.max(0, target - progress),
    daysRemaining: daysRemainingInPeriod(period, now, input.tz ?? DEFAULT_TIMEZONE),
    status: computePeriodStatus(progress, target, period, now),
  }
}

export { DEFAULT_GRACE_HOURS }
