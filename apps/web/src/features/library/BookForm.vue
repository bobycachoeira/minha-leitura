<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { normalizeCoverUrl, normalizeIsbn, searchCatalog, searchCatalogServer } from '../../api/catalog.js'
import type { CatalogBookMeta } from '@ml/shared'
import type { UserBookDraft } from '../../db/repositories.js'
import { useLibraryStore } from '../../stores/library.js'
import { useSessionStore } from '../../stores/session.js'
import AppIcon from '../../components/AppIcon.vue'
import IsbnScanner from './IsbnScanner.vue'

const library = useLibraryStore()
const session = useSessionStore()

const query = ref('')
const results = ref<CatalogBookMeta[]>([])
const searching = ref(false)
const message = ref<string | null>(null)
const selected = ref<CatalogBookMeta | null>(null)
const scannerOpen = ref(false)
const scannerSupported = ref(false)

onMounted(() => {
  scannerSupported.value = typeof window !== 'undefined' && 'BarcodeDetector' in window
})

function onDetected(code: string): void {
  scannerOpen.value = false
  query.value = code
  void runSearch()
}

const title = ref('')
const author = ref('')
const totalPages = ref<number | null>(null)
const saving = ref(false)

async function runSearch(): Promise<void> {
  searching.value = true
  message.value = null
  try {
    if (query.value.trim().length < 2) {
      results.value = []
      return
    }
    const raw = query.value.trim()
    const isbn = normalizeIsbn(raw)
    // Text search finds ISBNs too and returns richer data (author/pages); the
    // dedicated ISBN endpoint is the fallback.
    let found = await searchCatalogServer({ query: raw })
    if (found.length === 0 && isbn) found = await searchCatalogServer({ isbn })
    if (found.length === 0) found = await searchCatalog({ query: raw })
    if (found.length === 0 && isbn) found = await searchCatalog({ isbn })
    results.value = found
    if (results.value.length === 0) message.value = 'Nada encontrado. Você pode cadastrar manualmente.'
  } finally {
    searching.value = false
  }
}

function choose(meta: CatalogBookMeta): void {
  selected.value = meta
  title.value = meta.title
  author.value = meta.authors[0] ?? ''
  totalPages.value = meta.totalPages ?? null
  results.value = []
}

async function addTo(status: UserBookDraft['status'], owned = false): Promise<void> {
  if (!title.value.trim()) {
    message.value = 'Informe o título do livro.'
    return
  }
  saving.value = true
  try {
    await library.addBook(
      {
        space: session.spaceId ?? '',
        title: title.value.trim(),
        authors: author.value ? [author.value.trim()] : [],
        totalPages: totalPages.value,
        coverUrl: normalizeCoverUrl(selected.value?.coverUrl),
        isbn: selected.value?.isbn ?? null,
        externalId: selected.value?.externalId ?? null,
        genres: selected.value?.genres ?? [],
        source: selected.value ? 'open_library' : 'manual',
      },
      status,
      owned,
    )
    title.value = ''
    author.value = ''
    totalPages.value = null
    selected.value = null
    query.value = ''
    message.value = owned ? 'Adicionado à Estante.' : 'Guardado nos Desejos.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="card p-4 sm:p-5">
    <p class="eyebrow mb-3">Novo livro</p>

    <label class="label" for="catalog-query">Buscar no catálogo</label>
    <div class="mt-1.5 flex gap-2">
      <div class="relative flex-1">
        <AppIcon name="search" :size="18" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-mute" />
        <input
          id="catalog-query"
          v-model="query"
          type="search"
          placeholder="Título ou ISBN"
          class="input pl-10"
          @keyup.enter="runSearch"
        />
      </div>
      <button v-busy="searching" type="button" class="btn btn-ink" :disabled="searching" @click="runSearch">
        {{ searching ? 'Buscando…' : 'Buscar' }}
      </button>
      <button
        v-if="scannerSupported"
        type="button"
        class="btn btn-secondary"
        aria-label="Escanear ISBN com a câmera"
        title="Escanear ISBN"
        @click="scannerOpen = true"
      >
        <AppIcon name="camera" :size="18" />
      </button>
    </div>

    <ul v-if="results.length" class="mt-3 divide-y divide-line/60 overflow-hidden rounded-xl border border-line">
      <li v-for="meta in results" :key="meta.externalId">
        <button
          type="button"
          class="flex w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-paper-sunken"
          @click="choose(meta)"
        >
          <span class="grid h-8 w-6 shrink-0 place-items-center rounded bg-paper-sunken text-[0.62rem] font-semibold text-ink-soft">
            {{ (meta.title || '?').slice(0, 1).toUpperCase() }}
          </span>
          <span class="min-w-0 flex-1">
            <span class="block truncate text-sm font-medium text-ink">{{ meta.title }}</span>
            <span class="block truncate text-xs text-ink-mute">{{ meta.authors.join(', ') || 'Autor desconhecido' }}</span>
          </span>
          <AppIcon name="plus" :size="16" class="shrink-0 text-oxblood" />
        </button>
      </li>
    </ul>

    <div class="divider-ink my-4" />

    <div class="grid gap-3 sm:grid-cols-3">
      <label class="block sm:col-span-1">
        <span class="label">Título</span>
        <input v-model="title" class="input mt-1.5" placeholder="O nome da obra" />
      </label>
      <label class="block">
        <span class="label">Autor</span>
        <input v-model="author" class="input mt-1.5" placeholder="Quem escreveu" />
      </label>
      <label class="block">
        <span class="label">Páginas</span>
        <input v-model.number="totalPages" type="number" min="1" class="input mt-1.5" placeholder="—" />
      </label>
    </div>

    <p v-if="message" class="mt-3 text-sm text-ink-soft" role="status">{{ message }}</p>

    <div class="mt-4 flex flex-wrap gap-2">
      <button v-busy="saving" type="button" class="btn btn-secondary" :disabled="saving" @click="addTo('quero_ler', false)">
        <AppIcon name="bookmark" :size="16" /> Desejos
      </button>
      <button v-busy="saving" type="button" class="btn btn-primary" :disabled="saving" @click="addTo('quero_ler', true)">
        <AppIcon name="books" :size="16" /> Tenho
      </button>
    </div>

    <IsbnScanner v-if="scannerOpen" @detected="onDetected" @close="scannerOpen = false" />
  </div>
</template>
