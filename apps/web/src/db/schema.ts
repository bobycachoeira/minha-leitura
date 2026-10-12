import Dexie, { type Table } from 'dexie'
import type { Book, ReadingLog, UserBook } from '@ml/shared'

export interface SyncMeta {
  syncId: string
  space: string
  deletedAt?: string | null
  updatedBy?: string | null
  created?: string
  updated?: string
  _dirty?: boolean
  _pendingOutboxId?: number
}

export type LocalBook = Book & SyncMeta
export type LocalUserBook = UserBook & SyncMeta
export type LocalReadingLog = ReadingLog & SyncMeta

export interface OutboxItem {
  id?: number
  entity: string
  op: 'upsert' | 'delete'
  syncId: string
  recordId?: string
  space: string
  payload?: Record<string, unknown>
  updatedAt: string
  attempts: number
  lastError?: string | null
}

export interface MetaEntry {
  key: string
  value: string
}

export interface CoverCacheEntry {
  bookId: string
  blob: Blob
  bytes: number
  lastUsedAt: number
}

export interface CatalogCacheEntry {
  key: string
  results: unknown[]
  fetchedAt: number
  expiresAt: number
}

/** Local mirror of the server collections + Outbox + caches (T046). */
export class MLDatabase extends Dexie {
  books!: Table<LocalBook, string>
  userBooks!: Table<LocalUserBook, string>
  readingLogs!: Table<LocalReadingLog, string>
  outbox!: Table<OutboxItem, number>
  meta!: Table<MetaEntry, string>
  coverCache!: Table<CoverCacheEntry, string>
  catalogCache!: Table<CatalogCacheEntry, string>

  constructor() {
    super('minha-leitura')
    this.version(1).stores({
      books: 'id, space, syncId, title, source, deletedAt',
      userBooks: 'id, space, syncId, owner, book, status, deletedAt',
      readingLogs: 'id, space, syncId, owner, book, date, deletedAt',
      outbox: '++id, entity, syncId, space',
      meta: 'key',
      coverCache: 'bookId, lastUsedAt',
      catalogCache: 'key, expiresAt',
    })
  }
}

export const db = new MLDatabase()
