import {
  CATALOG_CACHE_TTL_DAYS,
  CATALOG_MAX_RESULTS,
  type CatalogBookMeta,
} from '@ml/shared'
import { db } from '../db/schema.js'
import { apiFetch } from './client.js'
import type { CatalogCacheEntry } from '../db/schema.js'

const OPEN_LIBRARY = 'https://openlibrary.org'
const COVERS = 'https://covers.openlibrary.org'
const TIMEOUT_MS = 8000

/** Normalizes cover URLs (Open Library serves images from covers.openlibrary.org). */
export function normalizeCoverUrl(url: string | null | undefined): string | null {
  if (!url) return null
  return url.replace('https://openlibrary.org/b/id/', 'https://covers.openlibrary.org/b/id/')
}

/**
 * Returns a clean ISBN (digits, ISBN-10 may end in X) when the input looks like
 * one — ignoring spaces/hyphens — or null otherwise. Lets the UI route ISBN
 * typed with or without a mask to the dedicated /isbn endpoint.
 */
export function normalizeIsbn(input: string): string | null {
  const cleaned = input.replace(/[-\s]/g, '')
  if (/^(?:\d{13}|\d{9}[\dXx])$/.test(cleaned)) return cleaned.toUpperCase()
  return null
}

interface OpenLibraryDoc {
  key?: string
  title?: string
  author_name?: string[]
  isbn?: string[]
  cover_i?: number
  number_of_pages_median?: number
  subject?: string[]
}

interface OpenLibrarySearchResponse {
  docs?: OpenLibraryDoc[]
}

function cacheKey(query: string, isbn?: string): string {
  return isbn ? `v2:isbn:${isbn.trim()}` : `v2:q:${query.trim().toLowerCase()}`
}

async function readCache(key: string): Promise<CatalogBookMeta[] | null> {
  const entry = await db.catalogCache.get(key)
  if (!entry) return null
  if (entry.expiresAt < Date.now()) {
    await db.catalogCache.delete(key)
    return null
  }
  return entry.results as CatalogBookMeta[]
}

async function writeCache(key: string, results: CatalogBookMeta[]): Promise<void> {
  const now = Date.now()
  const entry: CatalogCacheEntry = {
    key,
    results,
    fetchedAt: now,
    expiresAt: now + CATALOG_CACHE_TTL_DAYS * 86_400_000,
  }
  await db.catalogCache.put(entry)
}

function mapDoc(doc: OpenLibraryDoc): CatalogBookMeta {
  return {
    source: 'open_library',
    externalId: doc.key ?? doc.isbn?.[0] ?? '',
    title: doc.title ?? 'Sem título',
    authors: doc.author_name ?? [],
    isbn: doc.isbn?.[0] ?? null,
    coverUrl: doc.cover_i ? `${COVERS}/b/id/${doc.cover_i}-M.jpg` : null,
    totalPages: doc.number_of_pages_median ?? null,
    genres: (doc.subject ?? []).slice(0, 5),
  }
}

/**
 * Searches the free external catalog (Open Library). Max 10 results, 3s timeout
 * and a 30-day local cache; any failure degrades to an empty list (FR-013/037).
 */
export async function searchCatalog(
  input: { query?: string; isbn?: string },
  fetcher: typeof fetch = fetch,
): Promise<CatalogBookMeta[]> {
  const query = input.query ?? ''
  const isbn = input.isbn
  if (!query && !isbn) return []

  const key = cacheKey(query, isbn)
  const cached = await readCache(key)
  if (cached) return cached

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const url = isbn
      ? `${OPEN_LIBRARY}/isbn/${encodeURIComponent(isbn)}.json`
      : `${OPEN_LIBRARY}/search.json?limit=${CATALOG_MAX_RESULTS}&q=${encodeURIComponent(query)}`

    const res = await fetcher(url, { signal: controller.signal })
    if (!res.ok) return []

    const data = (await res.json()) as OpenLibrarySearchResponse | OpenLibraryDoc
    const docs = 'docs' in data && Array.isArray(data.docs) ? data.docs : [data as OpenLibraryDoc]
    const results = docs.slice(0, CATALOG_MAX_RESULTS).map(mapDoc)
    if (results.length > 0) {
      try {
        await writeCache(key, results)
      } catch {
        // a cache write failure must not discard freshly fetched results
      }
    }
    return results
  } catch {
    return []
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Searches the catalog through our backend (`/api/catalog/search`). This is the
 * path used by the UI: it avoids device-side CORS/network issues and is the same
 * Open Library data. Results are cached locally with the same 30-day TTL.
 */
export async function searchCatalogServer(input: {
  query?: string
  isbn?: string
}): Promise<CatalogBookMeta[]> {
  const query = (input.query ?? '').trim()
  const isbn = (input.isbn ?? '').trim()
  if (!query && !isbn) return []

  const key = cacheKey(query, isbn)
  const cached = await readCache(key)
  if (cached) return cached

  try {
    const results = await apiFetch<CatalogBookMeta[]>('/api/catalog/search', {
      query: { q: query || undefined, isbn: isbn || undefined },
    })
    const limited = Array.isArray(results) ? results.slice(0, CATALOG_MAX_RESULTS) : []
    if (limited.length > 0) {
      try {
        await writeCache(key, limited)
      } catch {
        // ignore cache errors
      }
    }
    return limited
  } catch {
    // Network/auth failure → let the caller fall back to the direct fetch.
    return []
  }
}
