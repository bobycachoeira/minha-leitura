import { db, type LocalBook, type LocalReadingLog, type LocalUserBook, type OutboxItem } from './schema.js'

export function localId(): string {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 15)
}

export function newSyncId(): string {
  return crypto.randomUUID()
}

/** Removes Vue reactive proxies / non-cloneable values before IndexedDB writes. */
function toPlain<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

type OutboxInput = Omit<OutboxItem, 'id' | 'attempts' | 'lastError'>

/** Notifies the app that a write was queued, so it can sync right away. */
function notifyOutbox(): void {
  try {
    window.dispatchEvent(new Event('ml:outbox'))
  } catch {
    // no window (tests/SSR)
  }
}

/** Writes first to Dexie and enqueues the operation in the Outbox (FR-027). */
async function enqueue(item: OutboxInput): Promise<number> {
  const id = await db.outbox.add(toPlain({ ...item, attempts: 0, lastError: null }))
  notifyOutbox()
  return id
}

async function pendingIdFor(syncId: string): Promise<number | undefined> {
  const item = await db.outbox.where('syncId').equals(syncId).first()
  return item?.id
}

export interface BookDraft {
  space: string
  title: string
  authors?: string[]
  isbn?: string | null
  coverUrl?: string | null
  totalPages?: number | null
  genres?: string[]
  source?: LocalBook['source']
  externalId?: string | null
}

export async function upsertLocalBook(draft: BookDraft, existingId?: string): Promise<LocalBook> {
  const now = new Date().toISOString()
  const syncId = newSyncId()
  const record: LocalBook = {
    id: existingId ?? localId(),
    space: draft.space,
    syncId,
    title: draft.title,
    authors: draft.authors ?? [],
    isbn: draft.isbn ?? null,
    coverUrl: draft.coverUrl ?? null,
    totalPages: draft.totalPages ?? null,
    genres: draft.genres ?? [],
    source: draft.source ?? 'manual',
    externalId: draft.externalId ?? null,
    updated: now,
    _dirty: true,
  }
  await db.books.put(toPlain(record))
  const outboxId = await enqueue({
    entity: 'books',
    op: 'upsert',
    syncId,
    recordId: record.id,
    space: draft.space,
    updatedAt: now,
    payload: {
      title: record.title,
      authors: record.authors,
      isbn: record.isbn,
      coverUrl: record.coverUrl,
      totalPages: record.totalPages,
      genres: record.genres,
      source: record.source,
      externalId: record.externalId,
    },
  })
  await db.books.update(record.id, { _pendingOutboxId: outboxId })
  return record
}

/** Patches an existing book (including its cover) and enqueues the update. */
export async function updateLocalBook(bookId: string, patch: Partial<BookDraft>): Promise<void> {
  const existing = await db.books.get(bookId)
  if (!existing) return
  const now = new Date().toISOString()
  const syncId = existing.syncId
  const updated: LocalBook = { ...existing, ...patch, syncId, updated: now, _dirty: true }
  await db.books.put(toPlain(updated))
  const outboxId = await enqueue({
    entity: 'books',
    op: 'upsert',
    syncId,
    recordId: existing.id,
    space: existing.space,
    updatedAt: now,
    payload: {
      title: updated.title,
      authors: updated.authors,
      isbn: updated.isbn,
      coverUrl: updated.coverUrl,
      totalPages: updated.totalPages,
      genres: updated.genres,
      source: updated.source,
      externalId: updated.externalId,
    },
  })
  await db.books.update(existing.id, { _pendingOutboxId: outboxId })
}

export interface UserBookDraft {
  space: string
  owner: string
  book: string
  status?: LocalUserBook['status']
  currentPage?: number
  rating?: number | null
  notes?: string | null
  review?: string | null
  reviewPublic?: boolean
  queueOrder?: number | null
  owned?: boolean
  format?: 'fisico' | 'ereader' | null
  favorite?: boolean
  startedAt?: string | null
  finishedAt?: string | null
}

export async function upsertLocalUserBook(
  draft: UserBookDraft,
  existingId?: string,
): Promise<LocalUserBook> {
  const now = new Date().toISOString()
  const previous = existingId ? await db.userBooks.get(existingId) : null
  const syncId = previous?.syncId ?? newSyncId()
  const record: LocalUserBook = {
    id: existingId ?? localId(),
    space: draft.space,
    syncId,
    owner: draft.owner,
    book: draft.book,
    status: draft.status ?? 'quero_ler',
    currentPage: draft.currentPage ?? 0,
    rating: draft.rating ?? null,
    notes: draft.notes ?? null,
    review: draft.review ?? null,
    reviewPublic: draft.reviewPublic ?? false,
    queueOrder: draft.queueOrder ?? null,
    owned: draft.owned ?? false,
    format: draft.format ?? null,
    favorite: draft.favorite ?? false,
    startedAt: draft.startedAt ?? null,
    finishedAt: draft.finishedAt ?? null,
    updated: now,
    _dirty: true,
  }
  await db.userBooks.put(toPlain(record))
  const linkedBook = await db.books.get(draft.book)
  const outboxId = await enqueue({
    entity: 'user_books',
    op: 'upsert',
    syncId,
    recordId: record.id,
    space: draft.space,
    updatedAt: now,
    payload: {
      book: record.book,
      bookExternalId: linkedBook?.externalId ?? null,
      bookTitle: linkedBook?.title ?? null,
      bookSyncId: linkedBook?.syncId ?? null,
      status: record.status,
      currentPage: record.currentPage,
      rating: record.rating,
      notes: record.notes,
      review: record.review,
      reviewPublic: record.reviewPublic,
      queueOrder: record.queueOrder,
      owned: record.owned,
      format: record.format,
      favorite: record.favorite,
      startedAt: record.startedAt,
      finishedAt: record.finishedAt,
    },
  })
  await db.userBooks.update(record.id, { _pendingOutboxId: outboxId })
  return record
}

export interface ReadingLogDraft {
  space: string
  owner: string
  book: string
  date: string
  pages: number
  startPage?: number | null
  endPage?: number | null
  minutes?: number | null
  note?: string | null
  quote?: string | null
  quotePage?: number | null
}

export async function addLocalReadingLog(draft: ReadingLogDraft): Promise<LocalReadingLog> {
  const now = new Date().toISOString()
  const syncId = newSyncId()
  const record: LocalReadingLog = {
    id: localId(),
    space: draft.space,
    syncId,
    owner: draft.owner,
    book: draft.book,
    date: draft.date,
    pages: draft.pages,
    startPage: draft.startPage ?? null,
    endPage: draft.endPage ?? null,
    minutes: draft.minutes ?? null,
    note: draft.note ?? null,
    quote: draft.quote ?? null,
    quotePage: draft.quotePage ?? null,
    updated: now,
    _dirty: true,
  }
  await db.readingLogs.put(toPlain(record))
  const logBook = await db.books.get(draft.book)
  const outboxId = await enqueue({
    entity: 'reading_logs',
    op: 'upsert',
    syncId,
    recordId: record.id,
    space: draft.space,
    updatedAt: now,
    payload: {
      book: record.book,
      bookExternalId: logBook?.externalId ?? null,
      bookTitle: logBook?.title ?? null,
      bookSyncId: logBook?.syncId ?? null,
      date: record.date,
      pages: record.pages,
      startPage: record.startPage,
      endPage: record.endPage,
      minutes: record.minutes,
      note: record.note,
      quote: record.quote,
      quotePage: record.quotePage,
    },
  })
  await db.readingLogs.update(record.id, { _pendingOutboxId: outboxId })
  return record
}

export interface ReadingLogPatch {
  date?: string
  pages?: number
  endPage?: number | null
  minutes?: number | null
  note?: string | null
  quote?: string | null
  quotePage?: number | null
}

export async function updateLocalReadingLog(logId: string, patch: ReadingLogPatch): Promise<void> {
  const existing = await db.readingLogs.get(logId)
  if (!existing) return
  const now = new Date().toISOString()
  const syncId = existing.syncId
  const updated = { ...existing, ...patch, syncId, updated: now, _dirty: true }
  await db.readingLogs.put(toPlain(updated))
  const editBook = await db.books.get(updated.book)
  const outboxId = await enqueue({
    entity: 'reading_logs',
    op: 'upsert',
    syncId,
    recordId: existing.id,
    space: existing.space,
    updatedAt: now,
    payload: {
      book: updated.book,
      bookExternalId: editBook?.externalId ?? null,
      bookTitle: editBook?.title ?? null,
      bookSyncId: editBook?.syncId ?? null,
      date: updated.date,
      pages: updated.pages,
      startPage: updated.startPage,
      endPage: updated.endPage,
      minutes: updated.minutes,
      note: updated.note,
      quote: updated.quote,
      quotePage: updated.quotePage,
    },
  })
  await db.readingLogs.update(existing.id, { _pendingOutboxId: outboxId })
}

export async function deleteLocalReadingLog(logId: string): Promise<void> {
  const existing = await db.readingLogs.get(logId)
  if (!existing) return
  const now = new Date().toISOString()
  const syncId = existing.syncId
  await db.readingLogs.update(logId, { deletedAt: now, syncId, _dirty: true })
  const delBook = await db.books.get(existing.book)
  await enqueue({
    entity: 'reading_logs',
    op: 'delete',
    syncId,
    recordId: existing.id,
    space: existing.space,
    updatedAt: now,
    payload: {
      book: existing.book,
      bookExternalId: delBook?.externalId ?? null,
      bookTitle: delBook?.title ?? null,
      bookSyncId: delBook?.syncId ?? null,
      date: existing.date,
      pages: existing.pages,
    },
  })
}

export async function listOutbox(): Promise<OutboxItem[]> {
  return db.outbox.orderBy('id').toArray()
}

export async function outboxCount(): Promise<number> {
  return db.outbox.count()
}

/**
 * Removes an outbox item. If it is an orphan update of a deleted record the
 * caller drops it with a warning instead of recreating (Constitution II).
 */
export async function settleOutbox(id: number): Promise<void> {
  await db.outbox.delete(id)
}

export async function failOutbox(id: number, error: string): Promise<void> {
  const item = await db.outbox.get(id)
  if (!item) return
  await db.outbox.update(id, { attempts: item.attempts + 1, lastError: error })
}

export { pendingIdFor }
