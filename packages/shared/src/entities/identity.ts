import { z } from 'zod'
import { ROLES } from '../constants/index.js'
import { syncableBaseSchema } from '../api/base.js'

export const spaceSchema = syncableBaseSchema.extend({
  name: z.string().min(1).max(80),
  settings: z.record(z.unknown()).default({}),
  createdBy: z.string(),
})

export const spaceMemberSchema = syncableBaseSchema.extend({
  user: z.string(),
  role: z.enum(ROLES),
  inviteStatus: z.enum(['pending', 'accepted']),
  joinedAt: z.string().datetime().nullable().optional(),
})

export const inviteSchema = z.object({
  id: z.string(),
  space: z.string(),
  role: z.enum(['partner', 'viewer']),
  emailInvited: z.string().email(),
  tokenHash: z.string(),
  expiresAt: z.string().datetime(),
  usedAt: z.string().datetime().nullable(),
  usedBy: z.string().nullable(),
  singleUse: z.boolean().default(true),
})

export type Space = z.infer<typeof spaceSchema>
export type SpaceMember = z.infer<typeof spaceMemberSchema>
export type Invite = z.infer<typeof inviteSchema>
