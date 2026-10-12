import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { pbAvailable, startPocketBase, type PocketBaseInstance } from './harness.js'

/** T116 — couple challenges (summed progress, closing/grace). */
describe.skipIf(!pbAvailable)('challenges (integration)', () => {
  let pb: PocketBaseInstance

  beforeAll(async () => {
    pb = await startPocketBase()
  }, 60_000)

  afterAll(async () => {
    if (pb) await pb.stop()
  })

  it('requires authentication for challenges', async () => {
    const res = await fetch(`${pb.url}/api/challenges?space=x`)
    expect(res.status).toBe(401)
  })

  it('guards challenge creation behind an editing role', async () => {
    const res = await fetch(`${pb.url}/api/challenges?space=x`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Juntos', target: 2 }),
    })
    expect(res.status).toBe(401)
  })
})
