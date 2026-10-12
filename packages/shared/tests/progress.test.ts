import { describe, expect, it } from 'vitest'
import { computeProgress } from '../src/index.js'

describe('computeProgress (US2)', () => {
  it('reports current page, remaining and percent', () => {
    const result = computeProgress({ status: 'lendo', currentPage: 120, totalPages: 320 }, [
      { endPage: 160 },
    ])
    expect(result.currentPage).toBe(160)
    expect(result.remaining).toBe(160)
    expect(result.percent).toBe(50)
    expect(result.status).toBe('lendo')
  })

  it('marks the book as lido once the total is reached', () => {
    const result = computeProgress({ status: 'lendo', currentPage: 300, totalPages: 300 })
    expect(result.status).toBe('lido')
    expect(result.remaining).toBe(0)
  })

  it('does not advance past the total page count', () => {
    const result = computeProgress({ status: 'lendo', currentPage: 0, totalPages: 300 }, [
      { endPage: 500 },
    ])
    expect(result.currentPage).toBe(300)
    expect(result.percent).toBe(100)
  })

  it('ignores soft-deleted logs', () => {
    const result = computeProgress({ status: 'lendo', currentPage: 100, totalPages: 300 }, [
      { endPage: 250, deletedAt: '2026-10-11T00:00:00.000Z' },
    ])
    expect(result.currentPage).toBe(100)
  })

  it('handles books without a known total', () => {
    const result = computeProgress({ status: 'lendo', currentPage: 10, totalPages: null }, [
      { endPage: 30 },
    ])
    expect(result.remaining).toBeNull()
    expect(result.percent).toBe(0)
  })
})
