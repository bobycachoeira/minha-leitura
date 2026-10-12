import { CATALOG_MAX_RESULTS, type RecommendationSource } from '../constants/index.js'

export interface TasteBookLike {
  genres?: string[]
  tags?: string[]
  authors?: string[]
  rating?: number
  favorite?: boolean
  status?: string
}

export interface CandidateBook {
  externalId: string
  title: string
  authors?: string[]
  genres?: string[]
  source: RecommendationSource
  popularity?: number
}

export interface TasteProfile {
  genres: Record<string, number>
  tags: Record<string, number>
  authors: Record<string, number>
}

export interface Recommendation {
  externalId: string
  title: string
  authors: string[]
  source: RecommendationSource
  score: number
  reason: string
}

function tally(values: string[] | undefined, weight: number, acc: Record<string, number>): void {
  for (const value of values ?? []) acc[value] = (acc[value] ?? 0) + weight
}

/** Builds a deterministic taste profile from the user's library (research D6). */
export function buildTasteProfile(books: TasteBookLike[]): TasteProfile {
  const profile: TasteProfile = { genres: {}, tags: {}, authors: {} }
  for (const book of books) {
    const weight = (book.favorite ? 2 : 1) + (book.rating ? book.rating / 5 : 0)
    tally(book.genres, weight, profile.genres)
    tally(book.tags, weight, profile.tags)
    tally(book.authors, weight, profile.authors)
  }
  return profile
}

export interface RecommendOptions {
  /** External ids already in the library or already dismissed. */
  excludedExternalIds?: string[]
  limit?: number
}

/**
 * Deterministic recommendation scorer. Excludes anything already in the library
 * (any status) or dismissed, so read/abandoned books never reappear (FR-025).
 */
export function recommend(
  profile: TasteProfile,
  candidates: CandidateBook[],
  options: RecommendOptions = {},
): Recommendation[] {
  const excluded = new Set(options.excludedExternalIds ?? [])
  const limit = Math.min(options.limit ?? CATALOG_MAX_RESULTS, CATALOG_MAX_RESULTS)

  const scored: Recommendation[] = []
  for (const candidate of candidates) {
    if (excluded.has(candidate.externalId)) continue

    let score = candidate.popularity ?? 0
    const reasons: Array<{ text: string; value: number }> = []

    for (const genre of candidate.genres ?? []) {
      const value = profile.genres[genre] ?? 0
      if (value > 0) {
        score += value
        reasons.push({ text: `porque você gostou de ${genre}`, value })
      }
    }
    for (const author of candidate.authors ?? []) {
      const value = profile.authors[author] ?? 0
      if (value > 0) {
        score += value * 1.5
        reasons.push({ text: `porque você gostou de ${author}`, value: value * 1.5 })
      }
    }

    if (reasons.length === 0) continue

    reasons.sort((a, b) => (b.value - a.value) || a.text.localeCompare(b.text))
    scored.push({
      externalId: candidate.externalId,
      title: candidate.title,
      authors: [...(candidate.authors ?? [])],
      source: candidate.source,
      score,
      reason: reasons[0]!.text,
    })
  }

  scored.sort((a, b) => (b.score - a.score) || a.title.localeCompare(b.title))
  return scored.slice(0, limit)
}
