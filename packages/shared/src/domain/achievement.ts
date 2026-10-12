import type { AchievementKind, GoalMetric } from '../constants/index.js'
import type { ISODate } from './dates.js'

export interface AchievementPayloadInput {
  kind: AchievementKind
  metric: GoalMetric
  target: number
  progress: number
  startDate: ISODate
  endDate: ISODate
  streak: number
  books?: string[]
  pages?: number
}

export interface AchievementPayload {
  kind: AchievementKind
  metric: GoalMetric
  target: number
  progress: number
  remaining: number
  startDate: ISODate
  endDate: ISODate
  streak: number
  books: string[]
  pages: number
}

/**
 * Builds a deterministic card payload from the period state (Constitution VII).
 * No timestamps are included so offline and online generation are identical for
 * the same state (FR-020, FR-021).
 */
export function buildAchievementPayload(input: AchievementPayloadInput): AchievementPayload {
  return {
    kind: input.kind,
    metric: input.metric,
    target: input.target,
    progress: input.progress,
    remaining: Math.max(0, input.target - input.progress),
    startDate: input.startDate,
    endDate: input.endDate,
    streak: input.streak,
    books: [...(input.books ?? [])].sort(),
    pages: input.pages ?? 0,
  }
}
