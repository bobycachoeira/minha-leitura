<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { computeProgress, type CatalogBookMeta, type ReadStatus } from '@ml/shared'
import { db } from '../../db/schema.js'
import { addLocalReadingLog, deleteLocalReadingLog, updateLocalReadingLog } from '../../db/repositories.js'
import { normalizeCoverUrl, searchCatalogServer } from '../../api/catalog.js'
import { createPost } from '../../api/feed-api.js'
import { useLibraryStore } from '../../stores/library.js'
import { useGoalsStore } from '../../stores/goals.js'
import { useMembersStore } from '../../stores/members.js'
import { useSessionStore } from '../../stores/session.js'
import BookCover from './BookCover.vue'
import BookReview from './BookReview.vue'
import PublishPrompt from '../../components/PublishPrompt.vue'
import FinishedPrompt from '../../components/FinishedPrompt.vue'
import ConfirmDialog from '../../components/ConfirmDialog.vue'
import AppIcon from '../../components/AppIcon.vue'

interface LogEntry {
  id: string
  date: string
  pages: number
  endPage?: number | null
  minutes?: number | null
  note?: string | null
  quote?: string | null
  quotePage?: number | null
}

const route = useRoute()
const router = useRouter()
const library = useLibraryStore()
const goals = useGoalsStore()
const members = useMembersStore()
const session = useSessionStore()

const myId = computed(() => session.user?.id ?? '')
const bookId = computed(() => String(route.params.id))
const book = computed(() => library.books.find((candidate) => candidate.id === bookId.value) ?? null)
const userBook = computed(
  () => library.userBooks.find((entry) => entry.book === bookId.value && entry.owner === myId.value) ?? null,
)
const partnerUserBook = computed(
  () => library.userBooks.find((entry) => entry.book === bookId.value && entry.owner !== myId.value) ?? null,
)
const partnerLabel = computed(() => {
  const owner = partnerUserBook.value?.owner
  if (!owner) return ''
  return members.nameOf(owner)
})

const partnerStatusText = computed(() => {
  const status = partnerUserBook.value?.status
  if (!status) return 'não tem na estante'
  return (
    {
      quero_ler: 'quer ler',
      lendo: `lendo · pág. ${partnerUserBook.value?.currentPage ?? 0}`,
      lido: 'já leu',
      abandonado: 'deixou de lado',
    } as Record<string, string>
  )[status]
})

const logs = ref<LogEntry[]>([])
const pages = ref<number | null>(null)
const date = ref(new Date().toISOString().slice(0, 10))
const endPage = ref<number | null>(null)
const note = ref('')
const quote = ref('')
const quotePage = ref<number | null>(null)
const detailsOpen = ref(false)

const editingLogId = ref<string | null>(null)
const editPages = ref<number | null>(null)
const editDate = ref('')
const editEndPage = ref<number | null>(null)

const promptOpen = ref(false)
const promptText = ref('')
const finishOpen = ref(false)
const pendingRemoveLog = ref<LogEntry | null>(null)
const registering = ref(false)

const progress = computed(() =>
  computeProgress(
    {
      status: userBook.value?.status ?? 'quero_ler',
      currentPage: userBook.value?.currentPage ?? 0,
      totalPages: book.value?.totalPages ?? null,
    },
    logs.value,
  ),
)

// ---- edit metadata / cover ----
const editing = ref(false)
const formTitle = ref('')
const formAuthor = ref('')
const formPages = ref<number | null>(null)
const formCoverUrl = ref<string | null>(null)
const formIsbn = ref<string | null>(null)
const formExternalId = ref<string | null>(null)
const formGenres = ref<string[]>([])
const formSource = ref<'manual' | 'open_library' | 'google_books'>('manual')
const coverResults = ref<CatalogBookMeta[]>([])
const searching = ref(false)
const message = ref<string | null>(null)

function openEdit(): void {
  if (!book.value) return
  formTitle.value = book.value.title
  formAuthor.value = book.value.authors[0] ?? ''
  formPages.value = book.value.totalPages ?? null
  formCoverUrl.value = book.value.coverUrl ?? null
  formIsbn.value = book.value.isbn ?? null
  formExternalId.value = book.value.externalId ?? null
  formGenres.value = book.value.genres ?? []
  formSource.value = book.value.source ?? 'manual'
  coverResults.value = []
  message.value = null
  editing.value = true
}

async function findCover(): Promise<void> {
  const term = formTitle.value.trim() || book.value?.title || ''
  if (term.length < 2) return
  searching.value = true
  message.value = null
  try {
    coverResults.value = await searchCatalogServer({ query: term })
    if (coverResults.value.length === 0) message.value = 'Nenhuma capa encontrada no catálogo.'
  } finally {
    searching.value = false
  }
}

function chooseCover(meta: CatalogBookMeta): void {
  formTitle.value = meta.title
  formAuthor.value = meta.authors[0] ?? formAuthor.value
  formPages.value = meta.totalPages ?? formPages.value
  formCoverUrl.value = normalizeCoverUrl(meta.coverUrl)
  formIsbn.value = meta.isbn ?? null
  formExternalId.value = meta.externalId ?? null
  formGenres.value = meta.genres ?? []
  formSource.value = 'open_library'
  coverResults.value = []
}

async function save(): Promise<void> {
  if (!book.value || !formTitle.value.trim()) return
  await library.updateBook(book.value.id, {
    title: formTitle.value.trim(),
    authors: formAuthor.value ? [formAuthor.value.trim()] : [],
    totalPages: formPages.value,
    coverUrl: formCoverUrl.value,
    isbn: formIsbn.value,
    externalId: formExternalId.value,
    genres: formGenres.value,
    source: formSource.value,
  })
  editing.value = false
}

// ---- reading logs ----
async function loadLogs(): Promise<void> {
  const rows = await db.readingLogs.where('book').equals(bookId.value).toArray()
  logs.value = rows
    .filter((row) => !row.deletedAt && row.owner === myId.value)
    .map((row) => ({
      id: row.id,
      date: row.date,
      pages: row.pages,
      endPage: row.endPage,
      minutes: row.minutes,
      note: row.note,
      quote: row.quote,
      quotePage: row.quotePage,
    }))
    .sort((a, b) => (a.date < b.date ? 1 : -1))
}

function openPublish(text: string): void {
  promptText.value = text
  promptOpen.value = true
}

async function publishPost(visibility: 'space' | 'public', text: string): Promise<void> {
  promptOpen.value = false
  try {
    if (session.spaceId) await createPost(session.spaceId, 'manual', text, undefined, visibility)
  } catch {
    // posting is best-effort; never break the screen over it
  }
}

async function register(): Promise<void> {
  if (!book.value || !pages.value || pages.value < 1) return
  registering.value = true
  try {
    const loggedPages = pages.value
    const title = book.value.title
    const before = new Map(goals.goals.map((g) => [g.id, goals.progressByGoal[g.id]?.status]))

    await addLocalReadingLog({
      space: session.spaceId ?? '',
      owner: session.user?.id ?? '',
      book: book.value.id,
      date: date.value,
      pages: loggedPages,
      endPage: endPage.value,
      note: note.value.trim() || null,
      quote: quote.value.trim() || null,
      quotePage: quotePage.value,
    })
    if (endPage.value) {
      await library.updateUserBook(book.value.id, { currentPage: endPage.value })
    }
    pages.value = null
    endPage.value = null
    note.value = ''
    quote.value = ''
    quotePage.value = null
    detailsOpen.value = false
    await loadLogs()

    // Did this log hit one of my goals?
    await goals.computeAll()
    const hit = goals.goals.find(
      (g) => before.get(g.id) !== 'batida' && goals.progressByGoal[g.id]?.status === 'batida',
    )
    if (hit) {
      const metric = hit.metric === 'paginas' ? 'páginas' : 'livros'
      openPublish(`Bati minha meta de ${hit.target} ${metric} ${hit.period === 'mes' ? 'no mês' : hit.period === 'semana' ? 'na semana' : 'no dia'}! 📚`)
    } else {
      openPublish(`Li ${loggedPages} páginas de "${title}"`)
    }
  } finally {
    registering.value = false
  }
}

function startEditLog(log: LogEntry): void {
  editingLogId.value = log.id
  editPages.value = log.pages
  editDate.value = log.date
  editEndPage.value = log.endPage ?? null
}

async function saveEditLog(): Promise<void> {
  if (!editingLogId.value || !editPages.value || editPages.value < 1) return
  await updateLocalReadingLog(editingLogId.value, {
    date: editDate.value,
    pages: editPages.value,
    endPage: editEndPage.value,
  })
  const edited = editPages.value
  editingLogId.value = null
  await loadLogs()
  openPublish(`Atualizei: ${edited} páginas de "${book.value?.title}"`)
}

async function removeLog(log: LogEntry): Promise<void> {
  pendingRemoveLog.value = log
}

async function confirmRemoveLog(): Promise<void> {
  if (!pendingRemoveLog.value) return
  await deleteLocalReadingLog(pendingRemoveLog.value.id)
  pendingRemoveLog.value = null
  await loadLogs()
}

function onStatusChanged(next: ReadStatus): void {
  if (!book.value) return
  if (next === 'lido') {
    // Ask when it was finished so old books don't count toward the goal.
    finishOpen.value = true
    return
  }
  const title = book.value.title
  const phrases: Record<ReadStatus, string> = {
    quero_ler: `Quero ler "${title}"`,
    lendo: `Comecei a ler "${title}"`,
    lido: `Terminei "${title}"`,
    abandonado: `Deixei de lado "${title}"`,
  }
  void library
    .updateUserBook(book.value.id, { status: next })
    .then(() => openPublish(phrases[next]))
    .catch(() => {
      // ignore — avoid unhandled rejection / blank screen
    })
}

async function confirmFinished(finishedAt: string | null): Promise<void> {
  if (!book.value) return
  const title = book.value.title
  finishOpen.value = false
  try {
    await library.updateUserBook(book.value.id, { status: 'lido', finishedAt })
    await goals.computeAll()
  } catch {
    // ignore
  }
  openPublish(`Terminei "${title}"`)
}

onMounted(async () => {
  if (library.books.length === 0) await library.load()
  void members.load()
  await goals.load()
  await loadLogs()
})
</script>

<template>
  <section v-if="book" class="space-y-6">
    <button class="btn btn-ghost btn-sm" @click="router.back()">
      <AppIcon name="back" :size="18" /> Voltar
    </button>

    <div class="flex gap-5">
      <div class="w-28 shrink-0 sm:w-36">
        <BookCover :book-id="book.id" :title="book.title" :author="book.authors[0]" :cover-url="book.coverUrl" :ribbon="userBook?.status === 'lendo'" />
      </div>
      <div class="flex min-w-0 flex-1 flex-col gap-2">
        <p class="eyebrow">{{ userBook?.status === 'lido' ? 'Concluído' : userBook?.status === 'lendo' ? 'Lendo agora' : 'Na sua lista' }}</p>
        <h1 class="display-hero text-2xl leading-tight">{{ book.title }}</h1>
        <p class="text-sm text-ink-soft">{{ book.authors.join(', ') || 'Autor desconhecido' }}</p>
        <BookReview :book="book" :status="userBook?.status" @changed="onStatusChanged" />

        <div class="mt-1">
          <div class="h-2 overflow-hidden rounded-full bg-paper-sunken">
            <div class="h-full rounded-full bg-oxblood transition-all duration-700" :style="{ width: `${progress.percent}%` }" />
          </div>
          <p class="mt-1 text-xs text-ink-mute">
            {{ progress.currentPage }} / {{ book.totalPages ?? '?' }} páginas · {{ progress.percent }}%
          </p>
          <p v-if="partnerUserBook" class="mt-1 text-xs text-ink-mute">
            {{ partnerLabel }}: {{ partnerStatusText }}
          </p>
        </div>

        <div class="mt-1 flex gap-2">
          <button v-if="!editing" class="btn btn-secondary btn-sm" @click="openEdit">
            <AppIcon name="edit" :size="14" /> Editar
          </button>
        </div>
      </div>
    </div>

    <p v-if="!book.coverUrl" class="chip !border-saffron/40 !text-saffron-600">Sem capa — use Editar → Buscar capa</p>

    <form v-if="editing" class="card space-y-4 p-4 sm:p-5" @submit.prevent="save">
      <p class="eyebrow">Editar livro</p>
      <div class="grid gap-3 sm:grid-cols-2">
        <label class="block"><span class="label">Título</span><input v-model="formTitle" required class="input mt-1.5" /></label>
        <label class="block"><span class="label">Autor</span><input v-model="formAuthor" class="input mt-1.5" /></label>
        <label class="block"><span class="label">Páginas</span><input v-model.number="formPages" type="number" min="1" class="input mt-1.5" /></label>
        <label class="block"><span class="label">URL da capa</span><input v-model="formCoverUrl" class="input mt-1.5" /></label>
      </div>
      <button v-busy="searching" type="button" class="btn btn-ink btn-sm" :disabled="searching" @click="findCover">
        <AppIcon name="search" :size="15" /> {{ searching ? 'Buscando…' : 'Buscar capa no catálogo' }}
      </button>
      <ul v-if="coverResults.length" class="divide-y divide-line/60 overflow-hidden rounded-xl border border-line" role="listbox">
        <li v-for="meta in coverResults" :key="meta.externalId">
          <button type="button" class="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-paper-sunken" @click="chooseCover(meta)">
            <span class="truncate text-sm">{{ meta.title }}</span>
            <span class="ml-2 shrink-0 text-xs text-ink-mute">{{ meta.authors.join(', ') }}</span>
          </button>
        </li>
      </ul>
      <div class="flex justify-end gap-2">
        <button type="button" class="btn btn-secondary" @click="editing = false">Cancelar</button>
        <button type="submit" class="btn btn-primary">Salvar</button>
      </div>
      <p v-if="message" class="text-sm text-ink-soft" role="status">{{ message }}</p>
    </form>

    <form class="card space-y-4 p-4 sm:p-5" @submit.prevent="register">
      <p class="eyebrow">Registrar leitura</p>
      <div class="grid gap-3 sm:grid-cols-3">
        <label class="block"><span class="label">Data</span><input v-model="date" type="date" class="input mt-1.5" /></label>
        <label class="block"><span class="label">Páginas lidas</span><input v-model.number="pages" type="number" min="1" class="input mt-1.5" /></label>
        <label class="block"><span class="label">Página atual</span><input v-model.number="endPage" type="number" min="1" class="input mt-1.5" placeholder="Opcional" /></label>
      </div>
      <button type="button" class="btn btn-ghost btn-sm" @click="detailsOpen = !detailsOpen">
        <AppIcon :name="detailsOpen ? 'close' : 'edit'" :size="15" />
        {{ detailsOpen ? 'Fechar' : 'Nota / citação' }}
      </button>
      <div v-if="detailsOpen" class="space-y-3">
        <label class="block">
          <span class="label">Nota da sessão</span>
          <textarea v-model="note" rows="2" maxlength="2000" class="textarea mt-1.5" placeholder="Como foi a leitura?" />
        </label>
        <label class="block">
          <span class="label">Citação</span>
          <textarea v-model="quote" rows="2" maxlength="2000" class="textarea mt-1.5" placeholder="Trecho que você gostou" />
        </label>
        <label class="block sm:w-40">
          <span class="label">Página da citação</span>
          <input v-model.number="quotePage" type="number" min="1" class="input mt-1.5" placeholder="Opcional" />
        </label>
      </div>
      <div class="flex justify-end">
        <button v-busy="registering" type="submit" class="btn btn-primary btn-sm" :disabled="registering"><AppIcon name="check" :size="15" /> Registrar</button>
      </div>
    </form>

    <div v-if="logs.length" class="card p-4 sm:p-5">
      <p class="eyebrow mb-3">Histórico de leitura</p>
      <ul class="divide-y divide-line/60">
        <li v-for="log in logs" :key="log.id" class="py-3">
          <div v-if="editingLogId !== log.id" class="space-y-1.5">
            <div class="flex items-center justify-between gap-3">
              <span class="text-sm text-ink-soft">{{ log.date }}</span>
              <span class="flex-1 text-right text-sm font-semibold text-ink">
                {{ log.pages }} páginas<template v-if="log.minutes"> · {{ log.minutes }} min</template>
              </span>
              <span class="flex items-center gap-1">
                <button class="btn btn-ghost btn-sm !px-2" aria-label="Editar lançamento" @click="startEditLog(log)">
                  <AppIcon name="edit" :size="15" />
                </button>
                <button class="btn btn-ghost btn-sm !px-2 text-oxblood" aria-label="Remover lançamento" @click="removeLog(log)">
                  <AppIcon name="close" :size="15" />
                </button>
              </span>
            </div>
            <p v-if="log.note" class="text-xs text-ink-mute">{{ log.note }}</p>
            <p v-if="log.quote" class="border-l-2 border-oxblood/40 pl-2 text-sm italic text-ink-soft">
              “{{ log.quote }}”<template v-if="log.quotePage"> — p. {{ log.quotePage }}</template>
            </p>
          </div>
          <form v-else class="grid gap-2 sm:grid-cols-4" @submit.prevent="saveEditLog">
            <input v-model="editDate" type="date" class="input !py-1.5 text-sm" />
            <input v-model.number="editPages" type="number" min="1" class="input !py-1.5 text-sm" />
            <input v-model.number="editEndPage" type="number" min="1" placeholder="Pág. atual" class="input !py-1.5 text-sm" />
            <div class="flex gap-1">
              <button type="submit" class="btn btn-primary btn-sm flex-1">Salvar</button>
              <button type="button" class="btn btn-secondary btn-sm" @click="editingLogId = null">×</button>
            </div>
          </form>
        </li>
      </ul>
    </div>
  </section>

  <div v-else class="card p-8 text-center text-sm text-ink-soft">Livro não encontrado no acervo local.</div>

  <PublishPrompt
    :open="promptOpen"
    :default-text="promptText"
    @close="promptOpen = false"
    @publish="publishPost"
  />

  <FinishedPrompt
    :open="finishOpen"
    :title="book?.title"
    @close="finishOpen = false"
    @confirm="confirmFinished"
  />

  <ConfirmDialog
    :open="pendingRemoveLog !== null"
    title="Excluir lançamento?"
    :message="
      pendingRemoveLog
        ? `O lançamento de ${pendingRemoveLog.pages} páginas em ${pendingRemoveLog.date} será removido e a meta será recalculada.`
        : ''
    "
    confirm-label="Excluir"
    danger
    @confirm="confirmRemoveLog"
    @cancel="pendingRemoveLog = null"
  />
</template>
