import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { pbAvailable, startPocketBase, type PocketBaseInstance } from './harness.js'

/** T097 — dashboard aggregations. */
describe.skipIf(!pbAvailable)('dashboard (integration)', () => {
  let pb: PocketBaseInstance

  beforeAll(async () => {
    pb = await startPocketBase()
  }, 60_000)

  afterAll(async () => {
    if (pb) await pb.stop()
  })

  it('requires authentication for the dashboard', async () => {
    const res = await fetch(`${pb.url}/api/dashboard?space=x`)
    expect(res.status).toBe(401)
  })
})
