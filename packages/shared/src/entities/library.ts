import { z } from 'zod'
import { CATALOG_SOURCES, READ_STATUSES } from '../constants/index.js'
import { isoDateSchema, syncableBaseSchema } from '../api/base.js'

export const bookSchema = syncableBaseSchema.extend({
  title: z.string().min(1).max(300),
  authors: z.array(z.string()).default([]),
  isbn: z.string().nullable().optional(),
  coverUrl: z.string().url().nullable().optional(),
  totalPages: z.number().int().positive().nullable().optional(),
  genres: z.array(z.string()).default([]),
  source: z.enum(CATALOG_SOURCES),
  externalId: z.string().nullable().optional(),
  createdBy: z.string().optional(),
})

export const userBookSchema = syncableBaseSchema.extend({
  owner: z.string(),
  book: z.string(),
  status: z.enum(READ_STATUSES),
  currentPage: z.number().int().min(0).default(0),
  rating: z.number().min(0).max(5).nullable().optional(),
  notes: z.string().nullable().optional(),
  review: z.string().max(500).nullable().optional(),
  reviewPublic: z.boolean().default(false),
  queueOrder: z.number().int().nullable().optional(),
  owned: z.boolean().default(false),
  format: z.enum(['fisico', 'ereader']).nullable().optional(),
  favorite: z.boolean().default(false),
  startedAt: isoDateSchema.nullable().optional(),
  finishedAt: isoDateSchema.nullable().optional(),
})

export const readingLogSchema = syncableBaseSchema.extend({
  owner: z.string(),
  book: z.string(),
  date: isoDateSchema,
  pages: z.number().int().min(1),
  startPage: z.number().int().nullable().optional(),
  endPage: z.number().int().nullable().optional(),
  minutes: z.number().int().min(0).nullable().optional(),
  note: z.string().nullable().optional(),
  quote: z.string().max(2000).nullable().optional(),
  quotePage: z.number().int().nullable().optional(),
})

export type Book = z.infer<typeof bookSchema>
export type UserBook = z.infer<typeof userBookSchema>
export type ReadingLog = z.infer<typeof readingLogSchema>
