import { z } from 'zod'
import { ACHIEVEMENT_KINDS, GOAL_METRICS, GOAL_PERIODS, PERIOD_STATUSES } from '../constants/index.js'
import { isoDateSchema, syncableBaseSchema } from '../api/base.js'

export const goalSchema = syncableBaseSchema.extend({
  owner: z.string(),
  metric: z.enum(GOAL_METRICS),
  period: z.enum(GOAL_PERIODS),
  target: z.number().int().positive(),
  weekStart: z.number().int().min(0).max(6).default(1),
  graceHours: z.number().int().min(0).default(24),
  active: z.boolean().default(true),
  startsOn: isoDateSchema,
})

export const goalPeriodSchema = syncableBaseSchema.extend({
  owner: z.string(),
  goal: z.string(),
  startDate: isoDateSchema,
  endDate: isoDateSchema,
  target: z.number().int().positive(),
  progress: z.number().int().min(0),
  status: z.enum(PERIOD_STATUSES),
  graceUntil: z.string().datetime(),
  closedAt: z.string().datetime().nullable().optional(),
  reopenedAt: z.string().datetime().nullable().optional(),
})

export const achievementSchema = syncableBaseSchema.extend({
  owner: z.string(),
  goalPeriod: z.string(),
  kind: z.enum(ACHIEVEMENT_KINDS),
  payload: z.record(z.unknown()),
  cardTheme: z.string().nullable().optional(),
})

export type Goal = z.infer<typeof goalSchema>
export type GoalPeriod = z.infer<typeof goalPeriodSchema>
export type Achievement = z.infer<typeof achievementSchema>
