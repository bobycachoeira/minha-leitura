<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { todayISODate, DEFAULT_TIMEZONE } from '@ml/shared'
import { db } from '../../db/schema.js'
import { addLocalReadingLog } from '../../db/repositories.js'
import { updateProfile } from '../../api/auth-api.js'
import { useLibraryStore } from '../../stores/library.js'
import { useGoalsStore } from '../../stores/goals.js'
import { useSessionStore } from '../../stores/session.js'
import { useToastsStore } from '../../stores/toasts.js'
import { useReadingTimerStore } from '../../stores/reading-timer.js'
import { remainingLabel } from '../../lib/format.js'
import BookCover from '../library/BookCover.vue'
import AppIcon from '../../components/AppIcon.vue'

const library = useLibraryStore()
const goals = useGoalsStore()
const session = useSessionStore()
const toasts = useToastsStore()
const timer = useReadingTimerStore()

const myId = computed(() => session.user?.id ?? '')
const today = todayISODate(DEFAULT_TIMEZONE)
const readToday = ref(false)
const lastLogByBook = ref<Record<string, string>>({})
const logging = ref(false)
const finishOpen = ref(false)
const sessionPages = ref<number | null>(null)

const current = computed(() => {
  const mine = library.userBooksOf(myId.value).filter((b) => b.status === 'lendo' && !b.deletedAt)
  if (mine.length === 0) return null
  const pinned = session.user?.currentBook
  const pinnedBook = pinned ? mine.find((b) => b.book === pinned) : undefined
  const last = lastLogByBook.value
  const ranked = [...mine].sort((a, b) => {
    const la = last[a.book] ?? ''
    const lb = last[b.book] ?? ''
    if (la !== lb) return la < lb ? 1 : -1
    return String(a.updated ?? '') < String(b.updated ?? '') ? 1 : -1
  })
  const userBook = pinnedBook ?? ranked[0]!
  return { userBook, book: library.books.find((bk) => bk.id === userBook.book) ?? null }
})

const dailyGoal = computed(
  () => goals.activeGoals.find((g) => g.goal.period === 'dia' && g.goal.metric === 'paginas') ?? null,
)

const nextInQueue = computed(() => {
  const first = library.myQueue()[0]
  if (!first) return null
  return { userBook: first, book: library.books.find((b) => b.id === first.book) ?? null }
})

async function startNext(): Promise<void> {
  const next = nextInQueue.value
  if (!next) return
  await library.updateUserBook(next.userBook.book, { status: 'lendo' })
  try {
    await updateProfile({ currentBook: next.userBook.book })
  } catch {
    // best-effort
  }
  toasts.push('Boa leitura! 📖', { kind: 'success' })
}

function mmss(seconds: number): string {
  const s = Math.max(0, seconds)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const ss = s % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return h > 0 ? `${h}:${pad(m)}:${pad(ss)}` : `${m}:${pad(ss)}`
}

async function refreshLogs(): Promise<void> {
  if (!session.spaceId || !myId.value) return
  const logs = await db.readingLogs.where('space').equals(session.spaceId).toArray()
  const mine = logs.filter((l) => !l.deletedAt && l.owner === myId.value)
  readToday.value = mine.some((l) => l.date === today)
  const map: Record<string, string> = {}
  for (const log of mine) {
    const previous = map[log.book]
    if (!previous || log.date > previous) map[log.book] = log.date
  }
  lastLogByBook.value = map
}

async function logPages(bookId: string, pages: number, minutes?: number): Promise<void> {
  if (!session.spaceId) return
  const ub = library.userBooksOf(myId.value).find((b) => b.book === bookId)
  const endPage = (ub?.currentPage ?? 0) + pages
  await addLocalReadingLog({
    space: session.spaceId,
    owner: myId.value,
    book: bookId,
    date: today,
    pages,
    endPage,
    minutes: minutes ?? null,
  })
  await library.updateUserBook(bookId, { currentPage: endPage, status: 'lendo' })
  await goals.computeAll()
  await refreshLogs()
}

async function quickLog(pages: number): Promise<void> {
  if (!current.value) return
  logging.value = true
  try {
    await logPages(current.value.userBook.book, pages)
    toasts.push(`+${pages} páginas registradas!`, { kind: 'success' })
  } finally {
    logging.value = false
  }
}

function startTimer(): void {
  const id = current.value?.userBook.book
  if (id) timer.start(id)
}

async function finishSession(): Promise<void> {
  const bookId = timer.bookId
  const pages = sessionPages.value ?? 0
  if (!bookId || pages < 1) return
  await logPages(bookId, pages, timer.elapsedMinutes)
  toasts.push(`Sessão de ${timer.elapsedMinutes} min registrada!`, { kind: 'success' })
  timer.reset()
  finishOpen.value = false
  sessionPages.value = null
}

function discardSession(): void {
  timer.reset()
  finishOpen.value = false
  sessionPages.value = null
}

onMounted(async () => {
  if (library.books.length === 0) await library.load()
  await goals.load()
  await refreshLogs()
})
</script>

<template>
  <section class="card p-4 sm:p-5">
    <div class="flex items-center justify-between gap-3">
      <p class="eyebrow flex items-center gap-1.5"><AppIcon name="sun" :size="14" /> Hoje</p>
      <span
        v-if="readToday"
        class="chip !py-0 text-[0.62rem] !text-sage !border-sage/40"
      >
        Você leu hoje
      </span>
    </div>

    <p v-if="dailyGoal" class="mt-2 text-sm text-ink-soft">
      <template v-if="dailyGoal.period?.status === 'batida'">Meta de páginas de hoje batida! 🎉</template>
      <template v-else>
        Faltam <strong class="text-ink">{{ remainingLabel('paginas', dailyGoal.period?.remaining ?? dailyGoal.goal.target) }}</strong> hoje
      </template>
    </p>

    <template v-if="current">
      <div class="mt-3 flex items-center gap-3">
        <RouterLink :to="`/library/${current.userBook.book}`" class="w-12 shrink-0">
          <BookCover
            :book-id="current.userBook.book"
            :title="current.book?.title ?? ''"
            :author="current.book?.authors?.[0]"
            :cover-url="current.book?.coverUrl"
          />
        </RouterLink>
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-semibold text-ink">{{ current.book?.title ?? 'Livro' }}</p>
          <p class="text-xs text-ink-mute">
            pág. {{ current.userBook.currentPage }}<template v-if="current.book?.totalPages"> / {{ current.book.totalPages }}</template>
          </p>
        </div>
        <button v-if="!timer.running && !timer.bookId" class="btn btn-secondary btn-sm shrink-0" @click="startTimer">
          <AppIcon name="sparkles" :size="15" /> Ler
        </button>
      </div>

      <div
        v-if="timer.running || timer.bookId"
        class="mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-paper-sunken px-3 py-2"
      >
        <span class="stat-num text-xl text-oxblood">{{ mmss(timer.elapsedSeconds) }}</span>
        <button v-if="timer.running" class="btn btn-secondary btn-sm" @click="timer.pause()">Pausar</button>
        <button v-else class="btn btn-secondary btn-sm" @click="timer.resume()">Retomar</button>
        <button class="btn btn-primary btn-sm" @click="finishOpen = true">Concluir</button>
        <button class="btn btn-ghost btn-sm text-ink-mute" @click="discardSession">Descartar</button>
      </div>

      <div v-if="finishOpen" class="mt-3 space-y-2 rounded-xl bg-paper-sunken p-3">
        <p class="text-sm text-ink-soft">Sessão de ~{{ timer.elapsedMinutes }} min — quantas páginas?</p>
        <div class="flex gap-2">
          <input v-model.number="sessionPages" type="number" min="1" placeholder="Páginas" class="input !py-1.5 text-sm" />
          <button class="btn btn-primary btn-sm" :disabled="!sessionPages || sessionPages < 1" @click="finishSession">Salvar</button>
        </div>
      </div>

      <div v-if="!finishOpen" class="mt-3 flex flex-wrap gap-2">
        <button v-busy="logging" class="btn btn-secondary btn-sm" :disabled="logging" @click="quickLog(10)">+10 páginas</button>
        <button v-busy="logging" class="btn btn-secondary btn-sm" :disabled="logging" @click="quickLog(20)">+20 páginas</button>
        <RouterLink :to="`/library/${current.userBook.book}`" class="btn btn-ghost btn-sm">Registrar</RouterLink>
      </div>
    </template>

    <div v-else class="mt-3">
      <template v-if="nextInQueue">
        <p class="text-sm text-ink-soft">Próximo da fila:</p>
        <div class="mt-1 flex items-center gap-3">
          <RouterLink :to="`/library/${nextInQueue.userBook.book}`" class="w-12 shrink-0">
            <BookCover
              :book-id="nextInQueue.userBook.book"
              :title="nextInQueue.book?.title ?? ''"
              :author="nextInQueue.book?.authors?.[0]"
              :cover-url="nextInQueue.book?.coverUrl"
            />
          </RouterLink>
          <p class="min-w-0 flex-1 truncate text-sm font-semibold text-ink">{{ nextInQueue.book?.title ?? 'Livro' }}</p>
          <button class="btn btn-primary btn-sm shrink-0" @click="startNext">Começar</button>
        </div>
      </template>
      <template v-else>
        <p class="text-sm text-ink-soft">Você não tem um livro em leitura.</p>
        <RouterLink to="/library" class="btn btn-secondary btn-sm mt-2">Comece um livro</RouterLink>
      </template>
    </div>
  </section>
</template>
