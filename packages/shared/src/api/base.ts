import { z } from 'zod'

/** Base fields for every synchronizable entity (Constitution II). */
export const syncableBaseSchema = z.object({
  id: z.string(),
  space: z.string(),
  syncId: z.string().uuid(),
  updatedBy: z.string().nullable().optional(),
  deletedAt: z.string().datetime().nullable().optional(),
  created: z.string().datetime().optional(),
  updated: z.string().datetime().optional(),
})

export type SyncableBase = z.infer<typeof syncableBaseSchema>

export const apiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.unknown().optional(),
})

export type ApiError = z.infer<typeof apiErrorSchema>

/** ISO business date (YYYY-MM-DD). */
export const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'data inválida (esperado YYYY-MM-DD)')
