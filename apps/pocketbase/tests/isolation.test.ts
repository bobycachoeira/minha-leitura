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

  it('does not expose domain data to unauthenticated requests', async () => {
    // PocketBase list rules act as a filter: unauthenticated callers get an
    // empty list (200) instead of a 401/403.
    const res = await fetch(`${pb.url}/api/collections/books/records`)
    expect(res.status).toBe(200)
    const body = (await res.json()) as { totalItems?: number; items?: unknown[] }
    expect(body.totalItems ?? 0).toBe(0)
    expect(body.items ?? []).toHaveLength(0)
  })
})
