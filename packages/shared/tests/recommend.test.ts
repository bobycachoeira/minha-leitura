import { describe, expect, it } from 'vitest'
import { buildTasteProfile, recommend } from '../src/index.js'

describe('recommend (US7)', () => {
  const library = [
    { genres: ['Ficção'], authors: ['Ursula K. Le Guin'], rating: 5, favorite: true, status: 'lido' },
    { genres: ['Ficção'], authors: ['Machado de Assis'], rating: 4, status: 'lido' },
  ]

  const candidates = [
    { externalId: 'a', title: 'A', authors: ['Ursula K. Le Guin'], genres: ['Ficção'], source: 'open_library' as const },
    { externalId: 'b', title: 'B', authors: ['Outro'], genres: ['Autoajuda'], source: 'open_library' as const },
    { externalId: 'c', title: 'C', authors: ['Machado de Assis'], genres: ['Ficção'], source: 'open_library' as const },
  ]

  it('is deterministic and explains the reason', () => {
    const profile = buildTasteProfile(library)
    const a = recommend(profile, candidates)
    const b = recommend(profile, candidates)
    expect(a).toEqual(b)
    expect(a.length).toBeGreaterThan(0)
    expect(a[0]?.reason).toMatch(/porque você gostou de/)
  })

  it('never recommends excluded (read/abandoned) books', () => {
    const profile = buildTasteProfile(library)
    const results = recommend(profile, candidates, { excludedExternalIds: ['a', 'c'] })
    expect(results.find((r) => r.externalId === 'a' || r.externalId === 'c')).toBeUndefined()
  })

  it('skips candidates with no taste overlap', () => {
    const profile = buildTasteProfile(library)
    const results = recommend(profile, [candidates[1]!])
    expect(results).toEqual([])
  })
})
