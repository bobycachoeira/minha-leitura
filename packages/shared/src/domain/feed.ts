import type { PostKind } from '../constants/index.js'

export interface FeedFact {
  kind: PostKind
  actor: string
  summary: string
  refBook?: string | null
  refAchievement?: string | null
  at: string
  /** Deterministic dedup key generated on the client. */
  syncId: string
}

export type FeedEvent = FeedFact

/**
 * Derives feed events from domain facts, de-duplicating by `syncId` so that a
 * fact is materialized into at most one post (research D7, FR-023).
 */
export function deriveFeedEvents(facts: FeedFact[]): FeedEvent[] {
  const seen = new Set<string>()
  const events: FeedEvent[] = []
  for (const fact of facts) {
    if (seen.has(fact.syncId)) continue
    seen.add(fact.syncId)
    events.push({ ...fact })
  }
  return events.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0))
}
