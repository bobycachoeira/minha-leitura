import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { LocalBook, LocalUserBook } from '../db/schema.js'
import { db } from '../db/schema.js'
import { upsertLocalBook, updateLocalBook, upsertLocalUserBook, type BookDraft, type UserBookDraft } from '../db/repositories.js'
import { useSessionStore } from './session.js'

export const useLibraryStore = defineStore('library', () => {
  const session = useSessionStore()
  const books = ref<LocalBook[]>([])
  const userBooks = ref<LocalUserBook[]>([])
  const loading = ref(false)

  const ownerId = computed(() => session.user?.id ?? '')

  /** Shared catalog (books) joined with a specific person's reading state. */
  function shelfFor(owner: string): Array<{ book: LocalBook; userBook: LocalUserBook | null }> {
    const byBook = new Map(userBooks.value.filter((entry) => entry.owner === owner).map((entry) => [entry.book, entry]))
    return books.value.map((book) => ({ book, userBook: byBook.get(book.id) ?? null }))
  }

  function userBooksOf(owner: string): LocalUserBook[] {
    return userBooks.value.filter((entry) => entry.owner === owner)
  }

  /** The current user's shelf (default). */
  const shelf = computed(() => shelfFor(ownerId.value))

  async function load(): Promise<void> {
    if (!session.spaceId) return
    loading.value = true
    try {
      books.value = await db.books.where('space').equals(session.spaceId).toArray()
      userBooks.value = await db.userBooks.where('space').equals(session.spaceId).toArray()
    } finally {
      loading.value = false
    }
  }

  async function addBook(
    draft: Parameters<typeof upsertLocalBook>[0],
    status: UserBookDraft['status'] = 'quero_ler',
  ): Promise<LocalBook> {
    const book = await upsertLocalBook(draft)
    await upsertLocalUserBook({ space: draft.space, owner: currentOwner(), book: book.id, status })
    await load()
    return book
  }

  /** Updates book metadata (e.g. cover) and syncs the change. */
  async function updateBook(bookId: string, patch: Partial<BookDraft>): Promise<void> {
    await updateLocalBook(bookId, patch)
    await load()
  }

  async function updateUserBook(
    bookId: string,
    patch: Partial<
      Pick<LocalUserBook, 'status' | 'currentPage' | 'rating' | 'notes' | 'favorite' | 'finishedAt' | 'startedAt'>
    >,
  ): Promise<void> {
    const perBook = await db.userBooks.where('book').equals(bookId).toArray()
    const existing = perBook.find((entry) => entry.owner === currentOwner()) ?? null
    if (existing) {
      await db.userBooks.update(existing.id, { ...patch, _dirty: true })
      await upsertLocalUserBook(
        {
          space: existing.space,
          owner: existing.owner,
          book: existing.book,
          status: patch.status ?? existing.status,
          currentPage: patch.currentPage ?? existing.currentPage,
          rating: patch.rating ?? existing.rating,
          notes: patch.notes ?? existing.notes,
          favorite: patch.favorite ?? existing.favorite,
          finishedAt: patch.finishedAt !== undefined ? patch.finishedAt : existing.finishedAt,
          startedAt: patch.startedAt ?? existing.startedAt,
        },
        existing.id,
      )
    } else {
      await upsertLocalUserBook({
        space: session.spaceId ?? '',
        owner: currentOwner(),
        book: bookId,
        status: patch.status ?? 'quero_ler',
        currentPage: patch.currentPage ?? 0,
        rating: patch.rating ?? null,
        notes: patch.notes ?? null,
        favorite: patch.favorite ?? false,
        finishedAt: patch.finishedAt ?? null,
        startedAt: patch.startedAt ?? null,
      })
    }
    await load()
  }

  function currentOwner(): string {
    return session.user?.id ?? ''
  }

  return { books, userBooks, shelf, shelfFor, userBooksOf, ownerId, loading, load, addBook, updateBook, updateUserBook }
})
