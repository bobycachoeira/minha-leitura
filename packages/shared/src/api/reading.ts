import { z } from 'zod'
import {
  CATALOG_MAX_RESULTS,
  CATALOG_SOURCES,
  GOAL_METRICS,
  GOAL_PERIODS,
  READ_STATUSES,
  REACTION_KINDS,
  RECOMMENDATION_SOURCES,
} from '../constants/index.js'
import { isoDateSchema } from './base.js'

export const catalogBookMetaSchema = z.object({
  source: z.enum(CATALOG_SOURCES),
  externalId: z.string(),
  title: z.string(),
  authors: z.array(z.string()).default([]),
  isbn: z.string().nullable().optional(),
  coverUrl: z.string().nullable().optional(),
  totalPages: z.number().int().positive().nullable().optional(),
  genres: z.array(z.string()).default([]),
})

export const catalogSearchResponseSchema = z.array(catalogBookMetaSchema).max(CATALOG_MAX_RESULTS)

export const bookInputSchema = z.object({
  title: z.string().min(1).max(300),
  authors: z.array(z.string()).default([]),
  isbn: z.string().nullable().optional(),
  coverUrl: z.string().url().nullable().optional(),
  totalPages: z.number().int().positive().nullable().optional(),
  genres: z.array(z.string()).default([]),
  source: z.enum(CATALOG_SOURCES).default('manual'),
  externalId: z.string().nullable().optional(),
  syncId: z.string().uuid(),
})

export const userBookInputSchema = z.object({
  book: z.string(),
  status: z.enum(READ_STATUSES).default('quero_ler'),
  currentPage: z.number().int().min(0).default(0),
  rating: z.number().min(0).max(5).nullable().optional(),
  notes: z.string().nullable().optional(),
  favorite: z.boolean().default(false),
  startedAt: isoDateSchema.nullable().optional(),
  finishedAt: isoDateSchema.nullable().optional(),
  syncId: z.string().uuid(),
})

export const readingLogInputSchema = z
  .object({
    book: z.string(),
    date: isoDateSchema,
    pages: z.number().int().min(1),
    startPage: z.number().int().nullable().optional(),
    endPage: z.number().int().nullable().optional(),
    note: z.string().nullable().optional(),
    syncId: z.string().uuid(),
  })
  .refine((v) => !v.endPage || !v.startPage || v.endPage >= v.startPage, {
    message: 'endPage deve ser >= startPage',
    path: ['endPage'],
  })

export const goalInputSchema = z.object({
  metric: z.enum(GOAL_METRICS),
  period: z.enum(GOAL_PERIODS),
  target: z.number().int().positive(),
  weekStart: z.number().int().min(0).max(6).default(1),
  graceHours: z.number().int().min(0).default(24),
  startsOn: isoDateSchema,
  active: z.boolean().default(true),
  syncId: z.string().uuid(),
})

export const goalPeriodViewSchema = z.object({
  id: z.string(),
  goal: z.string(),
  startDate: isoDateSchema,
  endDate: isoDateSchema,
  target: z.number().int(),
  progress: z.number().int(),
  remaining: z.number().int(),
  daysRemaining: z.number().int(),
  status: z.enum(['aberto', 'batida', 'nao_batida']),
  graceUntil: z.string().datetime(),
  closedAt: z.string().datetime().nullable().optional(),
  reopenedAt: z.string().datetime().nullable().optional(),
})

export const commentInputSchema = z.object({
  body: z.string().min(1).max(1000),
})

export const reactionInputSchema = z.object({
  kind: z.enum(REACTION_KINDS).default('curtir'),
})

export const recommendationInputSchema = z.object({
  externalId: z.string(),
  title: z.string(),
  authors: z.array(z.string()).default([]),
  coverUrl: z.string().url().nullable().optional(),
  reason: z.string(),
  source: z.enum(RECOMMENDATION_SOURCES),
})

export type CatalogBookMeta = z.infer<typeof catalogBookMetaSchema>
export type BookInput = z.infer<typeof bookInputSchema>
export type UserBookInput = z.infer<typeof userBookInputSchema>
export type ReadingLogInput = z.infer<typeof readingLogInputSchema>
export type GoalInput = z.infer<typeof goalInputSchema>
export type GoalPeriodView = z.infer<typeof goalPeriodViewSchema>
export type CommentInput = z.infer<typeof commentInputSchema>
export type ReactionInput = z.infer<typeof reactionInputSchema>
