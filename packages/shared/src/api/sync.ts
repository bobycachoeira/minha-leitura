import { z } from 'zod'

export const SYNC_ENTITIES = [
  'books',
  'user_books',
  'reading_logs',
  'goals',
  'goal_periods',
  'achievements',
  'posts',
  'reactions',
  'comments',
  'challenges',
] as const

export type SyncEntity = (typeof SYNC_ENTITIES)[number]

export const operationSchema = z.object({
  entity: z.enum(SYNC_ENTITIES),
  op: z.enum(['upsert', 'delete']),
  syncId: z.string().uuid(),
  space: z.string(),
  payload: z.record(z.unknown()).optional(),
  updatedAt: z.string().datetime(),
})

export const operationResultSchema = z.object({
  syncId: z.string().uuid(),
  status: z.enum(['applied', 'duplicate', 'rejected']),
  conflict: z.boolean().default(false),
  record: z.unknown().optional(),
  error: z.string().optional(),
})

export const pullChangeSchema = z.object({
  entity: z.enum(SYNC_ENTITIES),
  op: z.enum(['upsert', 'delete']),
  entityId: z.string(),
  seq: z.number().int(),
  record: z.record(z.unknown()).optional(),
  deletedAt: z.string().datetime().nullable().optional(),
})

export const pushRequestSchema = z.object({
  operations: z.array(operationSchema).max(100),
})

export const pushResponseSchema = z.object({
  results: z.array(operationResultSchema),
  cursor: z.string().optional(),
})

export const pullQuerySchema = z.object({
  since: z.string().optional(),
  limit: z.coerce.number().int().positive().max(500).default(200),
})

export const pullResponseSchema = z.object({
  changes: z.array(pullChangeSchema),
  cursor: z.string(),
  hasMore: z.boolean(),
})

export type Operation = z.infer<typeof operationSchema>
export type OperationResult = z.infer<typeof operationResultSchema>
export type PullChange = z.infer<typeof pullChangeSchema>
export type PushRequest = z.infer<typeof pushRequestSchema>
export type PushResponse = z.infer<typeof pushResponseSchema>
export type PullResponse = z.infer<typeof pullResponseSchema>
