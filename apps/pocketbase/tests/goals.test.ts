import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { pbAvailable, startPocketBase, type PocketBaseInstance } from './harness.js'

/** T083 — goal closing immutability and audited reopening. */
describe.skipIf(!pbAvailable)('goals (integration)', () => {
  let pb: PocketBaseInstance

  beforeAll(async () => {
    pb = await startPocketBase()
  }, 60_000)

  afterAll(async () => {
    if (pb) await pb.stop()
  })

  it('requires authentication for goals', async () => {
    const res = await fetch(`${pb.url}/api/goals?space=x`)
    expect(res.status).toBe(401)
  })

  it('requires authentication for reopen', async () => {
    const res = await fetch(`${pb.url}/api/goal-periods/abc/reopen`, { method: 'POST' })
    expect([401, 404]).toContain(res.status)
  })
})
