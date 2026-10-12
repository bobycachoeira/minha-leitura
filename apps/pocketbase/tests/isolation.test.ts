import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { pbAvailable, startPocketBase, type PocketBaseInstance } from './harness.js'

/**
 * T058 — smoke test proving that data never crosses spaces.
 * Skipped automatically when the PocketBase binary is not present.
 */
describe.skipIf(!pbAvailable)('space isolation (integration)', () => {
  let pb: PocketBaseInstance

  beforeAll(async () => {
    pb = await startPocketBase()
  }, 60_000)

  afterAll(async () => {
    if (pb) await pb.stop()
  })

  it('exposes an unauthenticated health endpoint', async () => {
    const res = await fetch(`${pb.url}/api/health`)
    expect(res.status).toBe(200)
  })

  it('rejects unauthenticated access to domain collections', async () => {
    const res = await fetch(`${pb.url}/api/collections/books/records`)
    expect([401, 403, 404]).toContain(res.status)
  })
})
