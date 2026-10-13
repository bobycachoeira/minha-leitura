import { defineStore } from 'pinia'
import { ref } from 'vue'
import { apiFetch } from '../api/client.js'
import { db } from '../db/schema.js'
import type { OutboxItem } from '../db/schema.js'
import { listOutbox, settleOutbox, failOutbox } from '../db/repositories.js'
import { useErrorsStore } from './errors.js'
import type { PushResponse, PullResponse, PullChange } from '@ml/shared'

const CURSOR_KEY = 'ml.cursor'

type ServerRecord = Record<string, unknown>

function toLocalBook(record: ServerRecord) {
  return {
    id: String(record.id),
    space: String(record.space),
    syncId: String(record.sync_id),
    title: String(record.title ?? ''),
    authors: (record.authors as string[]) ?? [],
    isbn: (record.isbn as string) || null,
    coverUrl: (record.cover_url as string) || null,
    totalPages: (record.total_pages as number) ?? null,
    genres: (record.genres as string[]) ?? [],
    source: (record.source as 'manual') ?? 'manual',
    externalId: (record.external_id as string) || null,
    deletedAt: (record.deleted_at as string) ?? null,
    updated: (record.updated as string) ?? undefined,
    _dirty: false,
  }
}

function toLocalUserBook(record: ServerRecord) {
  return {
    id: String(record.id),
    space: String(record.space),
    syncId: String(record.sync_id),
    owner: String(record.owner),
    book: String(record.book),
    status: (record.status as 'quero_ler') ?? 'quero_ler',
    currentPage: (record.current_page as number) ?? 0,
    rating: (record.rating as number) ?? null,
    notes: (record.notes as string) ?? null,
    review: (record.review as string) ?? null,
    reviewPublic: Boolean(record.review_public),
    queueOrder: (record.queue_order as number) ?? null,
    owned: Boolean(record.owned),
    favorite: Boolean(record.favorite),
    startedAt: (record.started_at as string) ?? null,
    finishedAt: (record.finished_at as string) ?? null,
    deletedAt: (record.deleted_at as string) ?? null,
    updated: (record.updated as string) ?? undefined,
    _dirty: false,
  }
}

function toLocalReadingLog(record: ServerRecord) {
  return {
    id: String(record.id),
    space: String(record.space),
    syncId: String(record.sync_id),
    owner: String(record.owner),
    book: String(record.book),
    date: String(record.date).slice(0, 10),
    pages: Number(record.pages ?? 0),
    startPage: (record.start_page as number) ?? null,
    endPage: (record.end_page as number) ?? null,
    minutes: (record.minutes as number) ?? null,
    note: (record.note as string) ?? null,
    quote: (record.quote as string) ?? null,
    quotePage: (record.quote_page as number) ?? null,
    deletedAt: (record.deleted_at as string) ?? null,
    updated: (record.updated as string) ?? undefined,
    _dirty: false,
  }
}

/** Persists a pulled change into the local mirror, including tombstones. */
async function applyChange(change: PullChange): Promise<void> {
  const record = change.record as ServerRecord | null | undefined
  if (change.op === 'delete') {
    const deletedAt = change.deletedAt ?? new Date().toISOString()
    if (change.entity === 'books') await db.books.update(change.entityId, { deletedAt })
    else if (change.entity === 'user_books') await db.userBooks.update(change.entityId, { deletedAt })
    else if (change.entity === 'reading_logs') await db.readingLogs.update(change.entityId, { deletedAt })
    return
  }
  if (!record) return
  if (change.entity === 'books') {
    const local = toLocalBook(record)
    const dups = await db.books
      .filter(
        (b) =>
          b.id !== local.id &&
          b.space === local.space &&
          (local.externalId ? b.externalId === local.externalId : b.title === local.title),
      )
      .toArray()
    for (const d of dups) await db.books.delete(d.id)
    await db.books.put(local)
  } else if (change.entity === 'user_books') {
    const local = toLocalUserBook(record)
    const dups = await db.userBooks
      .filter((b) => b.owner === local.owner && b.book === local.book && b.id !== local.id)
      .toArray()
    for (const d of dups) await db.userBooks.delete(d.id)
    await db.userBooks.put(local)
  } else if (change.entity === 'reading_logs') {
    const local = toLocalReadingLog(record)
    // The local copy keeps the client id until the pull; drop it so the same
    // logical record (same syncId) doesn't appear twice.
    const dups = await db.readingLogs.filter((l) => l.syncId === local.syncId && l.id !== local.id).toArray()
    for (const d of dups) await db.readingLogs.delete(d.id)
    await db.readingLogs.put(local)
  }
  // Other entities are not mirrored locally in this MVP.
}

/** Removes local mirror duplicates (same syncId stored twice) left by old bugs. */
async function dedupeLocalLogs(): Promise<void> {
  const outbox = await db.outbox.where('entity').equals('reading_logs').toArray()
  const pendingIds = new Set(outbox.map((o) => o.recordId))
  const all = await db.readingLogs.toArray()
  const bySync = new Map<string, typeof all>()
  for (const log of all) {
    const list = bySync.get(log.syncId) ?? []
    list.push(log)
    bySync.set(log.syncId, list)
  }
  for (const list of bySync.values()) {
    if (list.length < 2) continue
    const keep = list.find((l) => pendingIds.has(l.id)) ?? list.find((l) => !l._dirty) ?? list[0]!
    for (const log of list) {
      if (log.id !== keep.id) await db.readingLogs.delete(log.id)
    }
  }
}

export const useSyncStore = defineStore('sync', () => {
  const syncing = ref(false)
  const pendingCount = ref(0)
  const attempts = ref(0)
  const failedItems = ref<OutboxItem[]>([])
  const lastError = ref<string | null>(null)
  const lastSyncedAt = ref<string | null>(null)
  const cursor = ref<string>(localStorage.getItem(CURSOR_KEY) ?? '0')

  async function refreshPending(): Promise<void> {
    const items = await db.outbox.toArray()
    pendingCount.value = items.length
    attempts.value = items.reduce((max, item) => Math.max(max, item.attempts), 0)
    failedItems.value = items.filter((item) => item.attempts > 0 || item.lastError)
  }

  async function bootstrap(): Promise<void> {
    await refreshPending()
    await dedupeLocalLogs()
  }

  /** Pushes the Outbox in order; successful items leave the queue (FR-027/028). */
  async function push(): Promise<void> {
    const items = await listOutbox()
    if (items.length === 0) return

    const operations = items.map((item) => ({
      entity: item.entity,
      op: item.op,
      syncId: item.syncId,
      recordId: item.recordId,
      space: item.space,
      payload: item.payload,
      updatedAt: item.updatedAt,
    }))

    const response = await apiFetch<PushResponse>('/api/sync/push', {
      method: 'POST',
      body: { operations },
    })

    for (const result of response.results) {
      const item = items.find((candidate) => candidate.syncId === result.syncId)
      if (!item || item.id === undefined) continue
      if (result.status === 'applied' || result.status === 'duplicate') {
        await settleOutbox(item.id)
      } else {
        await failOutbox(item.id, result.error ?? 'rejeitado')
      }
    }
  }

  /** Pulls deltas since the cursor and mirrors them locally, including deletes. */
  async function pull(): Promise<void> {
    const response = await apiFetch<PullResponse>('/api/sync/pull', {
      query: { since: cursor.value, limit: 200 },
    })
    for (const change of response.changes) {
      await applyChange(change)
    }
    await dedupeLocalLogs()
    cursor.value = response.cursor
    localStorage.setItem(CURSOR_KEY, response.cursor)
  }

  async function sync(): Promise<void> {
    if (syncing.value) return
    syncing.value = true
    lastError.value = null
    try {
      await push()
      await pull()
      lastSyncedAt.value = new Date().toISOString()
    } catch (error) {
      lastError.value = error instanceof Error ? error.message : String(error)
      try {
        useErrorsStore().logError('Sync', lastError.value)
      } catch {
        // ignore
      }
    } finally {
      await refreshPending()
      syncing.value = false
    }
  }

  async function retryItem(id: number): Promise<void> {
    await db.outbox.update(id, { attempts: 0, lastError: null })
    await sync()
  }

  async function retryAll(): Promise<void> {
    for (const item of failedItems.value) {
      if (item.id !== undefined) await db.outbox.update(item.id, { attempts: 0, lastError: null })
    }
    await sync()
  }

  async function discardItem(id: number): Promise<void> {
    await settleOutbox(id)
    await refreshPending()
  }

  /** Wipes local data (books/logs/outbox/caches) and re-downloads from server. */
  async function hardReset(): Promise<void> {
    await db.books.clear()
    await db.userBooks.clear()
    await db.readingLogs.clear()
    await db.outbox.clear()
    await db.coverCache.clear()
    await db.catalogCache.clear()
    cursor.value = '0'
    localStorage.setItem(CURSOR_KEY, '0')
    await refreshPending()
    await sync()
  }

  return {
    syncing,
    pendingCount,
    attempts,
    failedItems,
    lastError,
    lastSyncedAt,
    cursor,
    bootstrap,
    refreshPending,
    push,
    pull,
    sync,
    retryItem,
    retryAll,
    discardItem,
    hardReset,
  }
})
