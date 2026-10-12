import { describe, expect, it } from 'vitest'
import {
  computePeriodProgress,
  computePeriodStatus,
  countFinishedBooksInPeriod,
  daysRemainingInPeriod,
  resolvePeriod,
  sumPagesInPeriod,
  type PeriodBounds,
} from '../src/index.js'

const period: PeriodBounds = {
  startDate: '2026-10-05',
  endDate: '2026-10-11',
  graceUntil: '2026-10-12T23:59:59.000Z',
}

describe('page compensation (paginas)', () => {
  it('sums pages within the period and ignores deleted logs', () => {
    const logs = [
      { date: '2026-10-05', pages: 20 },
      { date: '2026-10-06', pages: 0 },
      { date: '2026-10-07', pages: 30 },
      { date: '2026-10-12', pages: 99 }, // outside period
      { date: '2026-10-08', pages: 40, deletedAt: '2026-10-09T00:00:00Z' },
    ]
    expect(sumPagesInPeriod(logs, period)).toBe(50)
  })

  it('marks batida when the accumulated budget is reached before period end', () => {
    const result = computePeriodProgress({
      metric: 'paginas',
      target: 140,
      period,
      logs: [
        { date: '2026-10-05', pages: 100 },
        { date: '2026-10-07', pages: 40 },
      ],
      now: new Date('2026-10-08T12:00:00Z'),
    })
    expect(result.progress).toBe(140)
    expect(result.status).toBe('batida')
    expect(result.remaining).toBe(0)
  })

  it('stays aberto while inside the grace window', () => {
    const result = computePeriodProgress({
      metric: 'paginas',
      target: 140,
      period,
      logs: [{ date: '2026-10-11', pages: 100 }],
      now: new Date('2026-10-12T10:00:00Z'),
    })
    expect(result.status).toBe('aberto')
    expect(result.remaining).toBe(40)
  })

  it('closes as nao_batida after the grace window', () => {
    const result = computePeriodProgress({
      metric: 'paginas',
      target: 140,
      period,
      logs: [{ date: '2026-10-11', pages: 100 }],
      now: new Date('2026-10-13T00:00:00Z'),
    })
    expect(result.status).toBe('nao_batida')
  })
})

describe('book goals (livros) and abandonment (FR-036)', () => {
  it('counts only livros finished inside the period', () => {
    const books = [
      { status: 'lido' as const, finishedAt: '2026-10-06' },
      { status: 'lido' as const, finishedAt: '2026-10-20' }, // outside
      { status: 'abandonado' as const, finishedAt: '2026-10-07' },
      { status: 'lendo' as const, finishedAt: null },
    ]
    expect(countFinishedBooksInPeriod(books, period)).toBe(1)
  })

  it('drops an abandoned book from an open period', () => {
    const before = computePeriodProgress({
      metric: 'livros',
      target: 2,
      period,
      books: [{ status: 'lido', finishedAt: '2026-10-06' }],
      now: new Date('2026-10-07T12:00:00Z'),
    })
    const after = computePeriodProgress({
      metric: 'livros',
      target: 2,
      period,
      books: [{ status: 'abandonado', finishedAt: '2026-10-06' }],
      now: new Date('2026-10-07T12:00:00Z'),
    })
    expect(before.progress).toBe(1)
    expect(after.progress).toBe(0)
  })
})

describe('helpers', () => {
  it('computes days remaining inclusively', () => {
    expect(daysRemainingInPeriod(period, new Date('2026-10-07T12:00:00Z'), 'UTC')).toBe(5)
    expect(daysRemainingInPeriod(period, new Date('2026-10-20T12:00:00Z'), 'UTC')).toBe(0)
  })

  it('computePeriodStatus ties to the target', () => {
    expect(computePeriodStatus(140, 140, period)).toBe('batida')
  })

  it('resolvePeriod + progress integrate', () => {
    const p = resolvePeriod({ period: 'semana', weekStart: 1, graceHours: 24 }, '2026-10-11', 'UTC')
    expect(p.endDate).toBe(period.endDate)
  })
})
