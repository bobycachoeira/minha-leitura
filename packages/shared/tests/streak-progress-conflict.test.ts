import { describe, expect, it } from 'vitest'
import { computeProgress, computeStreak, resolveLWW } from '../src/index.js'

describe('computeStreak', () => {
  const periods = [
    { status: 'batida' as const, startDate: '2026-09-21', endDate: '2026-09-27' },
    { status: 'batida' as const, startDate: '2026-09-28', endDate: '2026-10-04' },
    { status: 'nao_batida' as const, startDate: '2026-10-05', endDate: '2026-10-11' },
    { status: 'batida' as const, startDate: '2026-10-12', endDate: '2026-10-18' },
  ]

  it('counts consecutive batida periods ending at the most recent closed one', () => {
    expect(computeStreak(periods)).toBe(1)
  })

  it('ignores open periods', () => {
    expect(
      computeStreak([
        { status: 'batida', startDate: '2026-09-28', endDate: '2026-10-04' },
        { status: 'aberto', startDate: '2026-10-05', endDate: '2026-10-11' },
      ]),
    ).toBe(1)
  })

  it('returns zero when the last closed period was not hit', () => {
    expect(
      computeStreak([{ status: 'nao_batida', startDate: '2026-10-05', endDate: '2026-10-11' }]),
    ).toBe(0)
  })
})

describe('computeProgress', () => {
  it('derives current page, remaining and percent', () => {
    const result = computeProgress({ status: 'lendo', currentPage: 100, totalPages: 300 }, [
      { endPage: 150 },
    ])
    expect(result.currentPage).toBe(150)
    expect(result.remaining).toBe(150)
    expect(result.percent).toBe(50)
    expect(result.status).toBe('lendo')
  })

  it('transitions to lido when the total is reached', () => {
    const result = computeProgress({ status: 'lendo', currentPage: 290, totalPages: 300 }, [
      { endPage: 300 },
    ])
    expect(result.status).toBe('lido')
    expect(result.remaining).toBe(0)
  })

  it('ignores deleted logs', () => {
    const result = computeProgress({ status: 'lendo', currentPage: 100, totalPages: 300 }, [
      { endPage: 250, deletedAt: '2026-10-09T00:00:00Z' },
    ])
    expect(result.currentPage).toBe(100)
  })

  it('handles a book without total pages', () => {
    const result = computeProgress({ status: 'lendo', currentPage: 42, totalPages: null }, [])
    expect(result.remaining).toBeNull()
    expect(result.percent).toBe(0)
  })
})

describe('resolveLWW', () => {
  it('picks the newer record and flags divergence', () => {
    const local = { updatedAt: '2026-10-11T10:00:00Z', value: 'local' }
    const remote = { updatedAt: '2026-10-11T11:00:00Z', value: 'remote' }
    const resolved = resolveLWW(local, remote)
    expect(resolved.winner.value).toBe('remote')
    expect(resolved.conflict).toBe(true)
  })

  it('server wins on tie', () => {
    const same = '2026-10-11T10:00:00Z'
    const resolved = resolveLWW(
      { updatedAt: same, value: 'local' },
      { updatedAt: same, value: 'remote' },
    )
    expect(resolved.winner.value).toBe('remote')
    expect(resolved.conflict).toBe(false)
  })

  it('keeps local when it is newer', () => {
    const resolved = resolveLWW(
      { updatedAt: '2026-10-11T12:00:00Z', value: 'local' },
      { updatedAt: '2026-10-11T11:00:00Z', value: 'remote' },
    )
    expect(resolved.winner.value).toBe('local')
  })
})
