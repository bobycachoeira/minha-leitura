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
    owned = false,
  ): Promise<LocalBook> {
    const book = await upsertLocalBook(draft)
    await upsertLocalUserBook({ space: draft.space, owner: currentOwner(), book: book.id, status, owned })
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
      Pick<
        LocalUserBook,
        | 'status'
        | 'currentPage'
        | 'rating'
        | 'notes'
        | 'review'
        | 'reviewPublic'
        | 'queueOrder'
        | 'owned'
        | 'favorite'
        | 'finishedAt'
        | 'startedAt'
      >
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
          rating: patch.rating !== undefined ? patch.rating : existing.rating,
          notes: patch.notes !== undefined ? patch.notes : existing.notes,
          review: patch.review !== undefined ? patch.review : existing.review,
          reviewPublic: patch.reviewPublic ?? existing.reviewPublic,
          queueOrder: patch.queueOrder !== undefined ? patch.queueOrder : existing.queueOrder,
          owned: patch.owned ?? existing.owned,
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
        review: patch.review ?? null,
        reviewPublic: patch.reviewPublic ?? false,
        queueOrder: patch.queueOrder ?? null,
        owned: patch.owned ?? false,
        favorite: patch.favorite ?? false,
        finishedAt: patch.finishedAt ?? null,
        startedAt: patch.startedAt ?? null,
      })
    }
    await load()
  }

  /** Owned books not yet started, in reading order. */
  function myQueue(): LocalUserBook[] {
    return userBooksOf(currentOwner())
      .filter((b) => !b.deletedAt && b.owned && b.status === 'quero_ler')
      .sort((a, b) => {
        const qa = a.queueOrder ?? Number.MAX_SAFE_INTEGER
        const qb = b.queueOrder ?? Number.MAX_SAFE_INTEGER
        if (qa !== qb) return qa - qb
        return String(a.updated ?? '') < String(b.updated ?? '') ? 1 : -1
      })
  }

  async function moveInQueue(bookId: string, direction: 'up' | 'down'): Promise<void> {
    const list = myQueue()
    const index = list.findIndex((b) => b.book === bookId)
    const target = direction === 'up' ? index - 1 : index + 1
    if (index < 0 || target < 0 || target >= list.length) return
    const reordered = [...list]
    const [item] = reordered.splice(index, 1)
    reordered.splice(target, 0, item!)
    for (let i = 0; i < reordered.length; i += 1) {
      const entry = reordered[i]!
      await updateUserBook(entry.book, { queueOrder: i })
    }
  }

  function currentOwner(): string {
    return session.user?.id ?? ''
  }

  return {
    books,
    userBooks,
    shelf,
    shelfFor,
    userBooksOf,
    myQueue,
    moveInQueue,
    ownerId,
    loading,
    load,
    addBook,
    updateBook,
    updateUserBook,
  }
})
