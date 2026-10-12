import { describe, expect, it } from 'vitest'
import {
  addDaysISO,
  endOfMonthISO,
  resolvePeriod,
  resolveScheduleForPeriod,
  startOfWeekISO,
  todayISODate,
  zonedWallTimeToUTC,
  type GoalSchedule,
} from '../src/index.js'

const weekly: GoalSchedule = { period: 'semana', weekStart: 1, graceHours: 24 }

describe('date helpers', () => {
  it('computes start of week honoring week_start', () => {
    // 2026-10-11 is a Sunday.
    expect(startOfWeekISO('2026-10-11', 1)).toBe('2026-10-05')
    expect(startOfWeekISO('2026-10-11', 0)).toBe('2026-10-11')
  })

  it('computes month bounds', () => {
    expect(endOfMonthISO('2026-02-10')).toBe('2026-02-28')
    expect(addDaysISO('2026-10-31', 1)).toBe('2026-11-01')
  })

  it('formats today in a timezone', () => {
    const ref = new Date('2026-10-12T02:00:00Z') // 2026-10-11 23:00 in São Paulo
    expect(todayISODate('America/Sao_Paulo', ref)).toBe('2026-10-11')
  })
})

describe('resolvePeriod', () => {
  it('resolves a day period', () => {
    const p = resolvePeriod({ period: 'dia', weekStart: 1, graceHours: 24 }, '2026-10-11', 'UTC')
    expect(p.startDate).toBe('2026-10-11')
    expect(p.endDate).toBe('2026-10-11')
  })

  it('resolves a week from Monday to Sunday', () => {
    const p = resolvePeriod(weekly, '2026-10-11', 'UTC')
    expect(p.startDate).toBe('2026-10-05')
    expect(p.endDate).toBe('2026-10-11')
  })

  it('resolves a civil month', () => {
    const p = resolvePeriod({ period: 'mes', weekStart: 1, graceHours: 24 }, '2026-10-11', 'UTC')
    expect(p.startDate).toBe('2026-10-01')
    expect(p.endDate).toBe('2026-10-31')
  })

  it('computes graceUntil as end-of-day plus grace hours in UTC', () => {
    const p = resolvePeriod(weekly, '2026-10-11', 'UTC')
    expect(p.graceUntil).toBe('2026-10-12T23:59:59.000Z')
  })
})

describe('start day change (FR-035)', () => {
  const change = { newWeekStart: 0, effectiveFrom: '2026-10-12' }

  it('keeps original week_start for periods before the change', () => {
    const s = resolveScheduleForPeriod(weekly, change, '2026-10-05')
    expect(s.weekStart).toBe(1)
  })

  it('applies new week_start from the next period only', () => {
    const s = resolveScheduleForPeriod(weekly, change, '2026-10-12')
    expect(s.weekStart).toBe(0)
  })
})

describe('zonedWallTimeToUTC', () => {
  it('converts a São Paulo wall time to UTC', () => {
    expect(zonedWallTimeToUTC('2026-10-11', '23:59:59', 'America/Sao_Paulo')).toBe(
      '2026-10-12T02:59:59.000Z',
    )
  })
})
