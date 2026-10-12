import { z } from 'zod'
import {
  CHALLENGE_PERIODS,
  GOAL_METRICS,
  PERIOD_STATUSES,
  POST_KINDS,
  REACTION_KINDS,
  RECOMMENDATION_SOURCES,
} from '../constants/index.js'
import { isoDateSchema, syncableBaseSchema } from '../api/base.js'

export const postSchema = syncableBaseSchema.extend({
  actor: z.string(),
  kind: z.enum(POST_KINDS),
  refBook: z.string().nullable().optional(),
  refAchievement: z.string().nullable().optional(),
  summary: z.string(),
})

export const reactionSchema = syncableBaseSchema.extend({
  post: z.string(),
  user: z.string(),
  kind: z.enum(REACTION_KINDS).default('curtir'),
})

export const commentSchema = syncableBaseSchema.extend({
  post: z.string(),
  author: z.string(),
  body: z.string().min(1).max(1000),
})

export const challengeSchema = syncableBaseSchema.extend({
  title: z.string().min(1),
  metric: z.enum(GOAL_METRICS),
  period: z.enum(CHALLENGE_PERIODS),
  target: z.number().int().positive(),
  startDate: isoDateSchema,
  endDate: isoDateSchema,
  graceHours: z.number().int().min(0).default(24),
  status: z.enum(PERIOD_STATUSES),
  createdBy: z.string().optional(),
})

export const challengeParticipantSchema = syncableBaseSchema.extend({
  challenge: z.string(),
  user: z.string(),
})

export const recommendationSchema = z.object({
  id: z.string(),
  owner: z.string(),
  externalId: z.string(),
  title: z.string(),
  authors: z.array(z.string()).default([]),
  coverUrl: z.string().url().nullable().optional(),
  reason: z.string(),
  source: z.enum(RECOMMENDATION_SOURCES),
  score: z.number(),
  dismissed: z.boolean().default(false),
  added: z.boolean().default(false),
  created: z.string().datetime(),
  expiresAt: z.string().datetime(),
})

export const notificationPreferenceSchema = z.object({
  space: z.string(),
  user: z.string(),
  goalReminders: z.boolean().default(true),
  periodCloseReminders: z.boolean().default(true),
  feed: z.boolean().default(true),
  subscriptions: z.array(z.unknown()).default([]),
})

export type Post = z.infer<typeof postSchema>
export type Reaction = z.infer<typeof reactionSchema>
export type Comment = z.infer<typeof commentSchema>
export type Challenge = z.infer<typeof challengeSchema>
export type RecommendationRecord = z.infer<typeof recommendationSchema>
