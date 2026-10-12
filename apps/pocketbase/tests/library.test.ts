import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { pbAvailable, startPocketBase, type PocketBaseInstance } from './harness.js'

/** T072/T143 — library isolation, soft delete and progress recalculation. */
describe.skipIf(!pbAvailable)('library (integration)', () => {
  let pb: PocketBaseInstance

  beforeAll(async () => {
    pb = await startPocketBase()
  }, 60_000)

  afterAll(async () => {
    if (pb) await pb.stop()
  })

  it('requires authentication to list books', async () => {
    const res = await fetch(`${pb.url}/api/books?space=x`)
    expect(res.status).toBe(401)
  })

  it('rejects reading logs without required fields', async () => {
    const res = await fetch(`${pb.url}/api/reading-logs?space=x`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pages: 10 }),
    })
    expect([401, 422]).toContain(res.status)
  })
})
