import { describe, expect, it } from 'vitest'
import { buildAchievementPayload } from '../src/index.js'

describe('buildAchievementPayload (US4)', () => {
  const base = {
    metric: 'paginas' as const,
    target: 140,
    startDate: '2026-10-05',
    endDate: '2026-10-11',
    streak: 3,
  }

  it('is deterministic for the same state (no timestamps)', () => {
    const a = buildAchievementPayload({ ...base, kind: 'meta_batida', progress: 140, books: ['b'] })
    const b = buildAchievementPayload({ ...base, kind: 'meta_batida', progress: 140, books: ['b'] })
    expect(a).toEqual(b)
  })

  it('computes remaining and sorts books deterministically', () => {
    const payload = buildAchievementPayload({
      ...base,
      kind: 'meta_nao_batida',
      progress: 100,
      books: ['zeta', 'alfa'],
    })
    expect(payload.remaining).toBe(40)
    expect(payload.books).toEqual(['alfa', 'zeta'])
  })

  it('never reports negative remaining', () => {
    const payload = buildAchievementPayload({ ...base, kind: 'meta_batida', progress: 200 })
    expect(payload.remaining).toBe(0)
  })
})
