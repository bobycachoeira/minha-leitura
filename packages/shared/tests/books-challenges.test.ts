import { describe, expect, it } from 'vitest'
import { computePeriodProgress, type PeriodBounds } from '../src/index.js'

/**
 * US8 — book goals and combined challenge progress share the goal engine.
 */
describe('book goals and challenges (US8)', () => {
  const period: PeriodBounds = {
    startDate: '2026-10-01',
    endDate: '2026-10-31',
    graceUntil: '2026-11-01T23:59:59.000Z',
  }

  it('counts only books finished within the period', () => {
    const result = computePeriodProgress({
      metric: 'livros',
      target: 2,
      period,
      books: [
        { status: 'lido', finishedAt: '2026-10-05' },
        { status: 'lido', finishedAt: '2026-11-05' },
      ],
      now: new Date('2026-10-20T00:00:00Z'),
    })
    expect(result.progress).toBe(1)
    expect(result.status).toBe('aberto')
  })

  it('marks a book goal as hit when the count reaches the target', () => {
    const result = computePeriodProgress({
      metric: 'livros',
      target: 2,
      period,
      books: [
        { status: 'lido', finishedAt: '2026-10-05' },
        { status: 'lido', finishedAt: '2026-10-15' },
      ],
      now: new Date('2026-10-20T00:00:00Z'),
    })
    expect(result.status).toBe('batida')
  })

  it('treats a combined space target as a summed budget', () => {
    const a = computePeriodProgress({ metric: 'livros', target: 4, period, books: [{ status: 'lido', finishedAt: '2026-10-05' }] })
    const b = computePeriodProgress({ metric: 'livros', target: 4, period, books: [{ status: 'lido', finishedAt: '2026-10-06' }] })
    expect(a.progress + b.progress).toBe(2)
  })
})
