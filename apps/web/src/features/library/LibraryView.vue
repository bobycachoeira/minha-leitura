<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import type { ReadStatus } from '@ml/shared'
import { useLibraryStore } from '../../stores/library.js'
import { useMembersStore } from '../../stores/members.js'
import { useSessionStore } from '../../stores/session.js'
import BookCover from './BookCover.vue'
import BookForm from './BookForm.vue'
import AppIcon from '../../components/AppIcon.vue'
import Avatar from '../../components/Avatar.vue'

type View = 'estante' | 'desejos' | 'catalogo'

const library = useLibraryStore()
const members = useMembersStore()
const session = useSessionStore()
const showForm = ref(false)
const view = ref<View>('estante')
const statusFilter = ref<ReadStatus | 'todos'>('todos')
const search = ref('')
const viewer = ref<string>('me')

const shelfStatuses: ReadStatus[] = ['lendo', 'lido', 'abandonado']

const myId = computed(() => session.user?.id ?? '')
const selectedOwner = computed(() => (viewer.value === 'me' ? myId.value : viewer.value))
const shelf = computed(() => library.shelfFor(selectedOwner.value))
const catalogShelf = computed(() => library.shelfFor(myId.value))
const others = computed(() => members.members.filter((m) => !m.isSelf))
const queue = computed(() => (viewer.value === 'me' ? library.myQueue() : []))

function queueIndex(bookId: string): number {
  return queue.value.findIndex((b) => b.book === bookId)
}

const shelfCount = computed(() => shelf.value.filter((e) => e.userBook && e.userBook.status !== 'quero_ler').length)
const wishCount = computed(() => shelf.value.filter((e) => e.userBook?.status === 'quero_ler').length)
const catalogCount = computed(() => library.books.length)

const filtered = computed(() => {
  const term = search.value.trim().toLowerCase()
  const base = view.value === 'catalogo' ? catalogShelf.value : shelf.value
  let pool = base
  if (view.value === 'estante') pool = base.filter((e) => e.userBook && e.userBook.status !== 'quero_ler')
  else if (view.value === 'desejos') pool = base.filter((e) => e.userBook?.status === 'quero_ler')
  return pool.filter(({ book, userBook }) => {
    const matchesStatus =
      view.value !== 'estante' || statusFilter.value === 'todos' || userBook?.status === statusFilter.value
    const matchesTerm =
      term.length === 0 ||
      book.title.toLowerCase().includes(term) ||
      book.authors.some((author) => author.toLowerCase().includes(term))
    return matchesStatus && matchesTerm
  })
})

const statusLabels: Record<ReadStatus | 'todos', string> = {
  todos: 'Todos',
  quero_ler: 'Desejo',
  lendo: 'Lendo',
  lido: 'Li',
  abandonado: 'Deixei',
}

async function moveToShelf(bookId: string): Promise<void> {
  await library.updateUserBook(bookId, { status: 'lendo' })
}

async function addToCatalog(bookId: string): Promise<void> {
  await library.updateUserBook(bookId, { status: 'quero_ler' })
}

onMounted(() => {
  void library.load()
  void members.load()
})
</script>

<template>
  <section class="space-y-5">
    <header class="flex items-end justify-between gap-3">
      <div>
        <p class="eyebrow">Sua coleção</p>
        <h1 class="display-hero mt-1 text-3xl">Estante &amp; Desejos</h1>
      </div>
      <button class="btn btn-primary btn-sm" @click="showForm = !showForm">
        <AppIcon :name="showForm ? 'close' : 'plus'" :size="16" />
        {{ showForm ? 'Fechar' : 'Livro' }}
      </button>
    </header>

    <Transition name="page">
      <BookForm v-if="showForm" />
    </Transition>

    <div v-if="members.hasPartner && view !== 'catalogo'" class="flex flex-wrap items-center gap-2">
      <button class="chip" :class="{ 'chip-active': viewer === 'me' }" @click="viewer = 'me'">
        <Avatar :name="members.me?.name ?? session.user?.name ?? 'Eu'" :size="18" /> Eu
      </button>
      <button
        v-for="member in others"
        :key="member.id"
        class="chip"
        :class="{ 'chip-active': viewer === member.user }"
        @click="viewer = member.user"
      >
        <Avatar :name="member.name" :size="18" /> {{ member.name }}
      </button>
    </div>

    <div class="flex flex-wrap items-center gap-2">
      <button class="chip" :class="{ 'chip-active': view === 'estante' }" @click="view = 'estante'">
        <AppIcon name="books" :size="15" /> Estante · {{ shelfCount }}
      </button>
      <button class="chip" :class="{ 'chip-active': view === 'desejos' }" @click="view = 'desejos'">
        <AppIcon name="bookmark" :size="15" /> Desejos · {{ wishCount }}
      </button>
      <button class="chip" :class="{ 'chip-active': view === 'catalogo' }" @click="view = 'catalogo'">
        <AppIcon name="search" :size="15" /> Catálogo · {{ catalogCount }}
      </button>
    </div>

    <div class="flex flex-col gap-2.5 sm:flex-row sm:items-center">
      <div class="relative flex-1">
        <AppIcon name="search" :size="18" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-mute" />
        <input v-model="search" type="search" placeholder="Buscar por título ou autor" class="input pl-10" />
      </div>
      <select v-if="view === 'estante'" v-model="statusFilter" class="select sm:w-40">
        <option v-for="status in ['todos', ...shelfStatuses]" :key="status" :value="status">
          {{ statusLabels[status as ReadStatus | 'todos'] }}
        </option>
      </select>
    </div>

    <div v-if="filtered.length === 0" class="card grid place-items-center gap-2 p-10 text-center">
      <AppIcon :name="view === 'desejos' ? 'bookmark' : view === 'catalogo' ? 'search' : 'books'" :size="26" class="text-ink-mute" />
      <p class="text-sm text-ink-soft">
        {{
          view === 'desejos'
            ? 'Nenhum desejo de leitura ainda.'
            : view === 'catalogo'
              ? 'O catálogo do espaço está vazio.'
              : 'A estante está vazia.'
        }}
      </p>
      <button v-if="!showForm" class="btn btn-secondary btn-sm" @click="showForm = true">Adicionar um livro</button>
    </div>

    <ul v-else class="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3">
      <li v-for="entry in filtered" :key="entry.book.id" class="book-tile flex flex-col gap-2">
        <RouterLink :to="`/library/${entry.book.id}`">
          <BookCover
            :book-id="entry.book.id"
            :title="entry.book.title"
            :author="entry.book.authors[0]"
            :cover-url="entry.book.coverUrl"
            :ribbon="entry.userBook?.status === 'lendo'"
          />
        </RouterLink>
        <div class="min-h-[2.6rem]">
          <p class="line-clamp-2-safe text-sm font-medium leading-snug text-ink">{{ entry.book.title }}</p>
          <p class="truncate text-xs text-ink-mute">{{ entry.book.authors.join(', ') || '—' }}</p>
          <p
            v-if="view === 'desejos' && viewer === 'me' && queueIndex(entry.book.id) === 0"
            class="text-[0.62rem] font-semibold text-sage"
          >
            Próximo da fila
          </p>
        </div>
        <template v-if="view === 'catalogo'">
          <button
            v-if="!entry.userBook"
            class="btn btn-secondary btn-sm mt-auto w-full"
            @click="addToCatalog(entry.book.id)"
          >
            <AppIcon name="plus" :size="15" /> Adicionar
          </button>
          <span v-else class="mt-auto text-center text-xs text-ink-mute">
            {{ statusLabels[entry.userBook.status] }}
          </span>
        </template>
        <template v-else-if="view === 'desejos' && viewer === 'me'">
          <div class="mt-auto flex items-center gap-1">
            <button
              class="btn btn-ghost btn-sm !px-2"
              aria-label="Subir na fila"
              :disabled="queueIndex(entry.book.id) <= 0"
              @click="library.moveInQueue(entry.book.id, 'up')"
            >
              <AppIcon name="back" :size="14" class="rotate-90" />
            </button>
            <button
              class="btn btn-ghost btn-sm !px-2"
              aria-label="Descer na fila"
              :disabled="queueIndex(entry.book.id) >= queue.length - 1"
              @click="library.moveInQueue(entry.book.id, 'down')"
            >
              <AppIcon name="back" :size="14" class="-rotate-90" />
            </button>
            <button class="btn btn-secondary btn-sm ml-auto" @click="moveToShelf(entry.book.id)">
              <AppIcon name="check" :size="15" /> Adquiri
            </button>
          </div>
        </template>
      </li>
    </ul>
  </section>
</template>
