<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { db } from '../../db/schema.js'
import { useSessionStore } from '../../stores/session.js'
import { useMembersStore } from '../../stores/members.js'
import { useToastsStore } from '../../stores/toasts.js'
import { useRetroCard } from './useRetroCard.js'
import { shareCard } from '../../lib/share.js'
import AppIcon from '../../components/AppIcon.vue'

type Kind = 'mes' | 'ano'

const session = useSessionStore()
const members = useMembersStore()
const toasts = useToastsStore()
const { render, toBlob } = useRetroCard()

const kind = ref<Kind>('mes')
const offset = ref(0)
const loading = ref(true)
const sharing = ref(false)

const myId = computed(() => session.user?.id ?? '')

interface Stats {
  pages: number
  books: number
  days: number
  streak: number
  topBook: string | null
  genres: string[]
  partnerName: string | null
  partnerPages: number
  partnerBooks: number
}
const stats = ref<Stats>({
  pages: 0,
  books: 0,
  days: 0,
  streak: 0,
  topBook: null,
  genres: [],
  partnerName: null,
  partnerPages: 0,
  partnerBooks: 0,
})

function iso(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function monthLabel(monthIndex: number): string {
  const name = new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(new Date(2024, monthIndex, 1))
  return name.charAt(0).toUpperCase() + name.slice(1)
}

const bounds = computed(() => {
  const now = new Date()
  if (kind.value === 'mes') {
    const d = new Date(now.getFullYear(), now.getMonth() + offset.value, 1)
    return {
      start: iso(new Date(d.getFullYear(), d.getMonth(), 1)),
      end: iso(new Date(d.getFullYear(), d.getMonth() + 1, 0)),
      title: `${d.getFullYear()}`,
      label: `${monthLabel(d.getMonth())} de ${d.getFullYear()}`,
    }
  }
  const year = now.getFullYear() + offset.value
  return { start: `${year}-01-01`, end: `${year}-12-31`, title: `${year}`, label: `${year}` }
})

const cardTitle = computed(() =>
  kind.value === 'mes'
    ? `Seu ${(bounds.value.label.split(' de ')[0] ?? bounds.value.label).toLowerCase()} em leitura`
    : `Seu ${bounds.value.label} em leitura`,
)

function longestRun(dates: string[]): number {
  const unique = [...new Set(dates)].sort()
  let best = 0
  let run = 0
  let previous = ''
  for (const day of unique) {
    if (previous) {
      const diff = (new Date(`${day}T00:00:00`).getTime() - new Date(`${previous}T00:00:00`).getTime()) / 86400000
      run = diff === 1 ? run + 1 : 1
    } else {
      run = 1
    }
    best = Math.max(best, run)
    previous = day
  }
  return best
}

async function load(): Promise<void> {
  loading.value = true
  try {
    const spaceId = session.spaceId ?? ''
    const { start, end } = bounds.value
    const [logs, userBooks, books] = await Promise.all([
      db.readingLogs.where('space').equals(spaceId).toArray(),
      db.userBooks.where('space').equals(spaceId).toArray(),
      db.books.where('space').equals(spaceId).toArray(),
    ])
    const titleById = new Map(books.map((b) => [b.id, b]))
    const inPeriod = (date?: string | null): boolean =>
      !!date && date.slice(0, 10) >= start && date.slice(0, 10) <= end

    const mineLogs = logs.filter((l) => !l.deletedAt && l.owner === myId.value && inPeriod(l.date))
    const partnerId = members.partner?.user
    const partnerLogs = partnerId
      ? logs.filter((l) => !l.deletedAt && l.owner === partnerId && inPeriod(l.date))
      : []

    const mineFinished = userBooks.filter(
      (b) => !b.deletedAt && b.owner === myId.value && b.status === 'lido' && inPeriod(b.finishedAt),
    )
    const partnerFinished = partnerId
      ? userBooks.filter((b) => !b.deletedAt && b.owner === partnerId && b.status === 'lido' && inPeriod(b.finishedAt))
      : []

    const top = [...mineFinished].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))[0]
    const genreCount = new Map<string, number>()
    for (const ub of mineFinished) {
      for (const g of titleById.get(ub.book)?.genres ?? []) {
        genreCount.set(g, (genreCount.get(g) ?? 0) + 1)
      }
    }

    stats.value = {
      pages: mineLogs.reduce((sum, l) => sum + l.pages, 0),
      books: mineFinished.length,
      days: new Set(mineLogs.map((l) => l.date)).size,
      streak: longestRun(mineLogs.map((l) => l.date)),
      topBook: top ? (titleById.get(top.book)?.title ?? null) : null,
      genres: [...genreCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([g]) => g),
      partnerName: members.partner?.name ?? null,
      partnerPages: partnerLogs.reduce((sum, l) => sum + l.pages, 0),
      partnerBooks: partnerFinished.length,
    }
  } finally {
    loading.value = false
  }
}

function pick(nextKind: Kind, nextOffset: number): void {
  kind.value = nextKind
  offset.value = nextOffset
}

async function share(format: 'square' | 'story'): Promise<void> {
  sharing.value = true
  try {
    const dataUrl = render(
      {
        title: cardTitle.value,
        periodLabel: bounds.value.label,
        pages: stats.value.pages,
        books: stats.value.books,
        days: stats.value.days,
        streak: stats.value.streak,
        topBook: stats.value.topBook ?? undefined,
        myPages: stats.value.pages,
        partnerName: stats.value.partnerName ?? undefined,
        partnerPages: stats.value.partnerPages,
      },
      format,
    )
    if (!dataUrl) return
    const blob = await toBlob(dataUrl)
    const result = await shareCard(blob, 'retrospectiva.png', cardTitle.value)
    toasts.push(result === 'shared' ? 'Compartilhado!' : 'Imagem baixada.')
  } finally {
    sharing.value = false
  }
}

watch([kind, offset], () => {
  void load()
})

onMounted(async () => {
  await members.load()
  await load()
})
</script>

<template>
  <section class="space-y-5">
    <header>
      <p class="eyebrow flex items-center gap-1.5"><AppIcon name="sparkles" :size="14" /> Seu período</p>
      <h1 class="display-hero mt-1 text-3xl">Retrospectiva</h1>
      <p class="mt-1 text-sm text-ink-soft">{{ bounds.label }}</p>
    </header>

    <div class="flex flex-wrap gap-2">
      <button class="chip" :class="{ 'chip-active': kind === 'mes' && offset === 0 }" @click="pick('mes', 0)">Este mês</button>
      <button class="chip" :class="{ 'chip-active': kind === 'mes' && offset === -1 }" @click="pick('mes', -1)">Mês passado</button>
      <button class="chip" :class="{ 'chip-active': kind === 'ano' && offset === 0 }" @click="pick('ano', 0)">Este ano</button>
      <button class="chip" :class="{ 'chip-active': kind === 'ano' && offset === -1 }" @click="pick('ano', -1)">Ano passado</button>
    </div>

    <p v-if="loading" class="text-sm text-ink-mute">Carregando…</p>

    <template v-else>
      <div class="card overflow-hidden p-6">
        <p class="eyebrow">{{ cardTitle }}</p>
        <p class="stat-num mt-1 text-5xl text-oxblood">{{ stats.pages }}</p>
        <p class="text-sm text-ink-soft">páginas · {{ stats.books }} livro(s) terminado(s)</p>
        <p class="mt-2 text-sm text-ink-mute">{{ stats.days }} dia(s) de leitura · sequência {{ stats.streak }}</p>
      </div>

      <div class="grid gap-4 sm:grid-cols-2">
        <div class="card p-5">
          <p class="eyebrow mb-2">Destaque</p>
          <p v-if="stats.topBook" class="display-hero text-xl text-ink">{{ stats.topBook }}</p>
          <p v-else class="text-sm text-ink-mute">Nenhum livro terminado no período.</p>
          <div v-if="stats.genres.length" class="mt-3 flex flex-wrap gap-1.5">
            <span v-for="g in stats.genres" :key="g" class="chip !py-0 text-[0.62rem]">{{ g }}</span>
          </div>
        </div>

        <div v-if="stats.partnerName" class="card p-5">
          <p class="eyebrow mb-2">Você × {{ stats.partnerName }}</p>
          <div class="flex items-end justify-between gap-4">
            <div>
              <p class="stat-num text-3xl text-oxblood">{{ stats.pages }}</p>
              <p class="text-xs text-ink-mute">você · {{ stats.books }} livro(s)</p>
            </div>
            <span class="pb-2 text-sm text-ink-mute">×</span>
            <div class="text-right">
              <p class="stat-num text-3xl text-ink">{{ stats.partnerPages }}</p>
              <p class="text-xs text-ink-mute">{{ stats.partnerName }} · {{ stats.partnerBooks }} livro(s)</p>
            </div>
          </div>
        </div>
      </div>

      <div class="flex flex-wrap gap-2">
        <button v-busy="sharing" class="btn btn-primary btn-sm" :disabled="sharing" @click="share('square')">
          <AppIcon name="sparkles" :size="15" /> Compartilhar resumo
        </button>
        <button v-busy="sharing" class="btn btn-secondary btn-sm" :disabled="sharing" @click="share('story')">
          Compartilhar (story)
        </button>
      </div>
    </template>
  </section>
</template>
