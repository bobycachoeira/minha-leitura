import { describe, expect, it } from 'vitest'
import { deriveFeedEvents, type FeedFact } from '../src/index.js'

describe('deriveFeedEvents (US6)', () => {
  const facts: FeedFact[] = [
    { kind: 'livro_concluido', actor: 'u1', summary: 'terminou X', at: '2026-10-10T10:00:00Z', syncId: 's1' },
    { kind: 'meta_batida', actor: 'u1', summary: 'bateu a meta', at: '2026-10-11T10:00:00Z', syncId: 's2' },
    { kind: 'livro_concluido', actor: 'u1', summary: 'terminou X', at: '2026-10-10T10:00:00Z', syncId: 's1' },
  ]

  it('de-duplicates by syncId', () => {
    expect(deriveFeedEvents(facts)).toHaveLength(2)
  })

  it('orders events newest first', () => {
    const events = deriveFeedEvents(facts)
    expect(events[0]?.syncId).toBe('s2')
  })

  it('returns an empty list for no facts', () => {
    expect(deriveFeedEvents([])).toEqual([])
  })
})
