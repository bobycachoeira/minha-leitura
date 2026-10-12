import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { pbAvailable, startPocketBase, type PocketBaseInstance } from './harness.js'

/** T103 — feed isolation and interactions. */
describe.skipIf(!pbAvailable)('feed (integration)', () => {
  let pb: PocketBaseInstance

  beforeAll(async () => {
    pb = await startPocketBase()
  }, 60_000)

  afterAll(async () => {
    if (pb) await pb.stop()
  })

  it('requires authentication for the feed', async () => {
    const res = await fetch(`${pb.url}/api/feed?space=x`)
    expect(res.status).toBe(401)
  })
})
