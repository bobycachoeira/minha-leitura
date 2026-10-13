/**
 * Domain enums, roles and catalog sources.
 * Single source of truth shared by the PWA client and PocketBase hooks.
 */

export const ROLES = ['owner', 'partner', 'viewer'] as const
export type Role = (typeof ROLES)[number]

export const READ_STATUSES = ['quero_ler', 'lendo', 'lido', 'abandonado'] as const
export type ReadStatus = (typeof READ_STATUSES)[number]

export const GOAL_METRICS = ['paginas', 'livros'] as const
export type GoalMetric = (typeof GOAL_METRICS)[number]

export const GOAL_PERIODS = ['dia', 'semana', 'mes'] as const
export type GoalPeriodUnit = (typeof GOAL_PERIODS)[number]

export const PERIOD_STATUSES = ['aberto', 'batida', 'nao_batida', 'congelado'] as const
export type PeriodStatus = (typeof PERIOD_STATUSES)[number]

export const CHALLENGE_PERIODS = ['semana', 'mes'] as const
export type ChallengePeriodUnit = (typeof CHALLENGE_PERIODS)[number]

export const POST_KINDS = ['livro_concluido', 'meta_batida', 'avanco', 'desafio', 'manual'] as const
export type PostKind = (typeof POST_KINDS)[number]

export const REACTION_KINDS = ['curtir', 'aplauso', 'forca'] as const
export type ReactionKind = (typeof REACTION_KINDS)[number]

export const CATALOG_SOURCES = ['manual', 'open_library', 'google_books'] as const
export type CatalogSource = (typeof CATALOG_SOURCES)[number]

export const RECOMMENDATION_SOURCES = ['interno', 'open_library', 'google_books'] as const
export type RecommendationSource = (typeof RECOMMENDATION_SOURCES)[number]

export const ACHIEVEMENT_KINDS = ['meta_batida', 'meta_nao_batida'] as const
export type AchievementKind = (typeof ACHIEVEMENT_KINDS)[number]

/** Business timezone default (`CF_TIMEZONE`). */
export const DEFAULT_TIMEZONE = 'America/Sao_Paulo'

/** Default grace window used to close a period, in hours. */
export const DEFAULT_GRACE_HOURS = 24

/** External catalog limits (FR-037). */
export const CATALOG_MAX_RESULTS = 10
export const CATALOG_CACHE_TTL_DAYS = 30
export const COVER_CACHE_MAX_ITEMS = 100
export const COVER_CACHE_MAX_BYTES = 50 * 1024 * 1024

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value)
}

export function canEdit(role: Role): boolean {
  return role === 'owner' || role === 'partner'
}
