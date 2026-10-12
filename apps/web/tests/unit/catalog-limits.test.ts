import { describe, expect, it, vi } from 'vitest'
import { CATALOG_CACHE_TTL_DAYS, CATALOG_MAX_RESULTS } from '@ml/shared'
import { searchCatalog } from '../../src/api/catalog.js'
import { db } from '../../src/db/schema.js'

function makeDocs(count: number): unknown {
  return {
    docs: Array.from({ length: count }, (_, i) => ({
      key: `/works/OL${i}W`,
      title: `Livro ${i}`,
      author_name: ['Autor'],
      cover_i: 100 + i,
      subject: ['Ficção'],
    })),
  }
}

describe('external catalog limits (FR-037)', () => {
  it('caps results at the maximum allowed', async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify(makeDocs(25)), { status: 200 }))
    const results = await searchCatalog({ query: 'livro' }, fetcher as unknown as typeof fetch)
    expect(results.length).toBe(CATALOG_MAX_RESULTS)
  })

  it('caches results and serves the cache on the next call', async () => {
    await db.catalogCache.clear()
    const fetcher = vi.fn(async () => new Response(JSON.stringify(makeDocs(3)), { status: 200 }))

    await searchCatalog({ query: 'cache-test' }, fetcher as unknown as typeof fetch)
    await searchCatalog({ query: 'cache-test' }, fetcher as unknown as typeof fetch)

    expect(fetcher).toHaveBeenCalledTimes(1)
    const entry = await db.catalogCache.get('v2:q:cache-test')
    expect(entry).toBeTruthy()
    expect(entry!.expiresAt - entry!.fetchedAt).toBe(CATALOG_CACHE_TTL_DAYS * 86_400_000)
  })

  it('degrades to an empty list when the catalog fails', async () => {
    await db.catalogCache.clear()
    const fetcher = vi.fn(async () => {
      throw new Error('offline')
    })
    const results = await searchCatalog({ query: 'falha' }, fetcher as unknown as typeof fetch)
    expect(results).toEqual([])
  })
})
