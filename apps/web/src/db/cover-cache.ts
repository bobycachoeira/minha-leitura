import { COVER_CACHE_MAX_BYTES, COVER_CACHE_MAX_ITEMS } from '@ml/shared'
import { db } from './schema.js'

/** Reads a cached cover blob, refreshing its LRU timestamp (FR-034/FR-037). */
export async function getCachedCover(bookId: string): Promise<Blob | undefined> {
  const entry = await db.coverCache.get(bookId)
  if (!entry) return undefined
  entry.lastUsedAt = Date.now()
  await db.coverCache.put(entry)
  return entry.blob
}

/** Stores a cover blob and evicts least-recently-used entries over the cap. */
export async function putCachedCover(bookId: string, blob: Blob): Promise<void> {
  await db.coverCache.put({ bookId, blob, bytes: blob.size, lastUsedAt: Date.now() })
  await enforceLimits()
}

async function enforceLimits(): Promise<void> {
  let entries = await db.coverCache.orderBy('lastUsedAt').toArray()
  let totalBytes = entries.reduce((sum, entry) => sum + entry.bytes, 0)

  for (const entry of entries) {
    const overCount = entries.length > COVER_CACHE_MAX_ITEMS
    const overBytes = totalBytes > COVER_CACHE_MAX_BYTES
    if (!overCount && !overBytes) break
    await db.coverCache.delete(entry.bookId)
    totalBytes -= entry.bytes
    entries = entries.slice(1)
  }
}

/** Downloads and caches a cover; returns null when it fails (degrades offline). */
export async function fetchAndCacheCover(bookId: string, url: string): Promise<Blob | null> {
  try {
    const res = await fetch(url, { mode: 'cors' })
    if (!res.ok) return null
    const blob = await res.blob()
    await putCachedCover(bookId, blob)
    return blob
  } catch {
    return null
  }
}
