import { describe, expect, it } from 'vitest'
import {
  bookInputSchema,
  goalInputSchema,
  goalPeriodViewSchema,
  operationResultSchema,
  operationSchema,
  pullResponseSchema,
  pushResponseSchema,
  readingLogInputSchema,
  userBookInputSchema,
} from '@ml/shared'

const uuid = '11111111-1111-4111-8111-111111111111'

describe('sync schemas', () => {
  it('accepts a valid upsert operation', () => {
    const parsed = operationSchema.parse({
      entity: 'reading_logs',
      op: 'upsert',
      syncId: uuid,
      space: 'space-1',
      updatedAt: '2026-10-11T12:00:00.000Z',
      payload: { pages: 20 },
    })
    expect(parsed.entity).toBe('reading_logs')
  })

  it('rejects an unknown entity', () => {
    expect(() =>
      operationSchema.parse({ entity: 'unknown', op: 'upsert', syncId: uuid, space: 's', updatedAt: '2026-10-11T12:00:00.000Z' }),
    ).toThrow()
  })

  it('validates a push response with a conflict flag', () => {
    const parsed = pushResponseSchema.parse({
      results: [{ syncId: uuid, status: 'applied', conflict: true }],
    })
    expect(parsed.results[0]?.conflict).toBe(true)
  })

  it('validates a pull response including soft deletes', () => {
    const parsed = pullResponseSchema.parse({
      changes: [{ entity: 'books', op: 'delete', entityId: 'b1', seq: 3, deletedAt: '2026-10-11T12:00:00.000Z' }],
      cursor: '3',
      hasMore: false,
    })
    expect(parsed.changes[0]?.op).toBe('delete')
  })

  it('validates an operation result status enum', () => {
    expect(operationResultSchema.parse({ syncId: uuid, status: 'duplicate' }).status).toBe('duplicate')
  })
})

describe('reading schemas', () => {
  it('requires a positive page count on reading logs', () => {
    expect(() =>
      readingLogInputSchema.parse({ book: 'b1', date: '2026-10-11', pages: 0, syncId: uuid }),
    ).toThrow()
  })

  it('rejects endPage before startPage', () => {
    expect(() =>
      readingLogInputSchema.parse({
        book: 'b1',
        date: '2026-10-11',
        pages: 10,
        startPage: 100,
        endPage: 50,
        syncId: uuid,
      }),
    ).toThrow()
  })

  it('accepts a book input with manual source', () => {
    expect(bookInputSchema.parse({ title: 'Livro', syncId: uuid }).source).toBe('manual')
  })

  it('defaults user book status to quero_ler', () => {
    expect(userBookInputSchema.parse({ book: 'b1', syncId: uuid }).status).toBe('quero_ler')
  })

  it('defaults goal weekStart and graceHours', () => {
    const goal = goalInputSchema.parse({
      metric: 'paginas',
      period: 'semana',
      target: 140,
      startsOn: '2026-10-05',
      syncId: uuid,
    })
    expect(goal.weekStart).toBe(1)
    expect(goal.graceHours).toBe(24)
  })

  it('validates a goal period view with reopenedAt', () => {
    const parsed = goalPeriodViewSchema.parse({
      id: 'gp1',
      goal: 'g1',
      startDate: '2026-10-05',
      endDate: '2026-10-11',
      target: 140,
      progress: 140,
      remaining: 0,
      daysRemaining: 0,
      status: 'batida',
      graceUntil: '2026-10-12T23:59:59.000Z',
      reopenedAt: null,
    })
    expect(parsed.status).toBe('batida')
  })
})
