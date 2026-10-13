<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { db } from '../../db/schema.js'
import { useSessionStore } from '../../stores/session.js'
import { useToastsStore } from '../../stores/toasts.js'
import { formatDayMonth } from '../../lib/format.js'
import AppIcon from '../../components/AppIcon.vue'

interface Entry {
  id: string
  bookId: string
  title: string
  date: string
  pages: number
  minutes: number | null
  note: string | null
  quote: string | null
  quotePage: number | null
}

const session = useSessionStore()
const toasts = useToastsStore()
const loading = ref(true)
const entries = ref<Entry[]>([])
const search = ref('')
const bookFilter = ref('')
const onlyQuotes = ref(false)

const myId = computed(() => session.user?.id ?? '')

async function load(): Promise<void> {
  loading.value = true
  try {
    const spaceId = session.spaceId ?? ''
    const [logs, books] = await Promise.all([
      db.readingLogs.where('space').equals(spaceId).toArray(),
      db.books.where('space').equals(spaceId).toArray(),
    ])
    const titleById = new Map(books.map((b) => [b.id, b.title]))
    entries.value = logs
      .filter((l) => !l.deletedAt && l.owner === myId.value)
      .map((l) => ({
        id: l.id,
        bookId: l.book,
        title: titleById.get(l.book) ?? 'Livro',
        date: l.date,
        pages: l.pages,
        minutes: l.minutes ?? null,
        note: l.note ?? null,
        quote: l.quote ?? null,
        quotePage: l.quotePage ?? null,
      }))
      .sort((a, b) => (a.date < b.date ? 1 : -1))
  } finally {
    loading.value = false
  }
}

const bookOptions = computed(() => {
  const map = new Map<string, string>()
  for (const e of entries.value) map.set(e.bookId, e.title)
  return [...map.entries()]
})

const filtered = computed(() => {
  const term = search.value.trim().toLowerCase()
  return entries.value.filter((e) => {
    if (bookFilter.value && e.bookId !== bookFilter.value) return false
    if (onlyQuotes.value && !e.quote) return false
    if (!term) return true
    return (
      e.title.toLowerCase().includes(term) ||
      (e.note ?? '').toLowerCase().includes(term) ||
      (e.quote ?? '').toLowerCase().includes(term)
    )
  })
})

const groups = computed(() => {
  const map = new Map<string, Entry[]>()
  for (const e of filtered.value) {
    const list = map.get(e.date) ?? []
    list.push(e)
    map.set(e.date, list)
  }
  return [...map.entries()]
})

async function share(entry: Entry): Promise<void> {
  const text = entry.quote
    ? `“${entry.quote}”${entry.quotePage ? ` (p. ${entry.quotePage})` : ''} — ${entry.title}`
    : `${entry.note ?? ''} — ${entry.title}`
  try {
    if (navigator.share) await navigator.share({ text })
    else {
      await navigator.clipboard.writeText(text)
      toasts.push('Trecho copiado!')
    }
  } catch {
    /* cancelado */
  }
}

onMounted(load)
</script>

<template>
  <section class="space-y-5">
    <header>
      <p class="eyebrow flex items-center gap-1.5"><AppIcon name="edit" :size="14" /> Suas anotações</p>
      <h1 class="display-hero mt-1 text-3xl">Diário</h1>
      <p class="mt-1 text-sm text-ink-soft">Notas, citações e sessões da sua leitura.</p>
    </header>

    <div class="flex flex-col gap-2.5 sm:flex-row sm:items-center">
      <div class="relative flex-1">
        <AppIcon name="search" :size="18" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-mute" />
        <input v-model="search" type="search" placeholder="Buscar em notas e citações" class="input pl-10" />
      </div>
      <select v-model="bookFilter" class="select sm:w-48">
        <option value="">Todos os livros</option>
        <option v-for="[id, title] in bookOptions" :key="id" :value="id">{{ title }}</option>
      </select>
      <button class="chip" :class="{ 'chip-active': onlyQuotes }" @click="onlyQuotes = !onlyQuotes">
        <AppIcon name="bookmark" :size="15" /> Só citações
      </button>
    </div>

    <p v-if="loading" class="text-sm text-ink-mute">Carregando…</p>

    <div v-else-if="filtered.length === 0" class="card grid place-items-center gap-2 p-10 text-center">
      <AppIcon name="edit" :size="26" class="text-ink-mute" />
      <p class="text-sm text-ink-soft">Nada no diário ainda. Registre uma leitura com nota ou citação.</p>
    </div>

    <div v-else class="space-y-5">
      <div v-for="[date, items] in groups" :key="date" class="space-y-2">
        <p class="eyebrow">{{ formatDayMonth(date) }}</p>
        <ul class="space-y-2">
          <li v-for="entry in items" :key="entry.id" class="card p-4">
            <div class="flex items-center justify-between gap-3">
              <RouterLink :to="`/library/${entry.bookId}`" class="min-w-0 truncate text-sm font-semibold text-ink hover:underline">
                {{ entry.title }}
              </RouterLink>
              <span class="shrink-0 text-xs text-ink-mute">
                {{ entry.pages }} páginas<template v-if="entry.minutes"> · {{ entry.minutes }} min</template>
              </span>
            </div>
            <p v-if="entry.note" class="mt-2 text-sm text-ink-soft">{{ entry.note }}</p>
            <blockquote v-if="entry.quote" class="mt-2 border-l-2 border-oxblood/40 pl-3 text-sm italic text-ink">
              “{{ entry.quote }}”
              <span v-if="entry.quotePage" class="text-xs text-ink-mute">— p. {{ entry.quotePage }}</span>
            </blockquote>
            <div v-if="entry.quote || entry.note" class="mt-2 flex justify-end">
              <button class="btn btn-ghost btn-sm !px-2 text-ink-mute" aria-label="Compartilhar" @click="share(entry)">
                <AppIcon name="sparkles" :size="15" /> Compartilhar
              </button>
            </div>
          </li>
        </ul>
      </div>
    </div>
  </section>
</template>
