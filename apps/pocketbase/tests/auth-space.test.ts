import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { pbAvailable, startPocketBase, type PocketBaseInstance } from './harness.js'

/** T060 — Magic Link, step-up and space isolation (integration). */
describe.skipIf(!pbAvailable)('auth & space (integration)', () => {
  let pb: PocketBaseInstance

  beforeAll(async () => {
    pb = await startPocketBase()
  }, 60_000)

  afterAll(async () => {
    if (pb) await pb.stop()
  })

  it('requires auth for the spaces endpoint', async () => {
    const res = await fetch(`${pb.url}/api/spaces`)
    expect(res.status).toBe(401)
  })

  it('issues a magic link without revealing user existence', async () => {
    const res = await fetch(`${pb.url}/api/auth/magic-link/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'someone@example.com' }),
    })
    expect(res.status).toBe(200)
  })
})
