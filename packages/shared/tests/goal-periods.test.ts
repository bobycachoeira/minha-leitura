import { describe, expect, it } from 'vitest'
import { resolvePeriod, resolveScheduleForPeriod, todayISODate } from '../src/index.js'

/**
 * FR-035 — changing the start-of-week only affects the next period; the open
 * and closed periods keep their original boundaries.
 */
describe('goal periods advanced (FR-035)', () => {
  const change = { newWeekStart: 0, effectiveFrom: '2026-10-12' }

  it('does not re-bucket a period that started before the change', () => {
    const schedule = resolveScheduleForPeriod(
      { period: 'semana', weekStart: 1, graceHours: 24 },
      change,
      '2026-10-05',
    )
    const period = resolvePeriod(schedule, '2026-10-08', 'UTC')
    expect(period.startDate).toBe('2026-10-05')
    expect(period.endDate).toBe('2026-10-11')
  })

  it('applies the new start day from the next period onward', () => {
    const schedule = resolveScheduleForPeriod(
      { period: 'semana', weekStart: 1, graceHours: 24 },
      change,
      '2026-10-12',
    )
    const period = resolvePeriod(schedule, '2026-10-14', 'UTC')
    expect(period.startDate).toBe('2026-10-11')
    expect(period.endDate).toBe('2026-10-17')
  })

  it('handles weeks crossing month boundaries', () => {
    const period = resolvePeriod({ period: 'semana', weekStart: 1, graceHours: 24 }, '2026-11-01', 'UTC')
    expect(period.startDate <= period.endDate).toBe(true)
    expect(period.startDate).toBe('2026-10-26')
    expect(period.endDate).toBe('2026-11-01')
  })

  it('keeps today deterministic in the business timezone', () => {
    const ref = new Date('2026-11-01T02:30:00Z')
    expect(todayISODate('America/Sao_Paulo', ref)).toBe('2026-10-31')
  })
})
