<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { apiFetch } from '../../api/client.js'
import { db } from '../../db/schema.js'
import { listMembers, type SpaceMemberItem } from '../../api/space-api.js'
import { useSessionStore } from '../../stores/session.js'
import Avatar from '../../components/Avatar.vue'
import AppIcon from '../../components/AppIcon.vue'

interface ChallengeItem {
  id: string
  title: string
  metric: string
  period: string
  target: number
  status: string
  progress?: number
}

type DuelWindow = 'semana' | 'mes' | 'ano'
type DuelMetric = 'livros' | 'paginas'

const session = useSessionStore()
const challenges = ref<ChallengeItem[]>([])
const members = ref<SpaceMemberItem[]>([])
const title = ref('')
const target = ref(2)
const metric = ref<'livros' | 'paginas'>('livros')
const creating = ref(false)

// ---- duel ----
const duelWindow = ref<DuelWindow>('mes')
const duelMetric = ref<DuelMetric>('paginas')
const duel = ref<Array<{ userId: string; name: string; value: number }>>([])

const isSolo = computed(() => members.value.length < 2)

const duelWindows: DuelWindow[] = ['semana', 'mes', 'ano']
const duelMetrics: DuelMetric[] = ['paginas', 'livros']

const windowLabels: Record<DuelWindow, string> = { semana: 'esta semana', mes: 'este mês', ano: 'este ano' }
const metricLabels: Record<DuelMetric, string> = { paginas: 'páginas', livros: 'livros' }
const duelLeader = computed(() => {
  const sorted = [...duel.value].sort((a, b) => b.value - a.value)
  const top = sorted[0]
  const second = sorted[1]
  if (!top || !second || top.value === second.value) return null
  return top
})
const duelMax = computed(() => Math.max(1, ...duel.value.map((d) => d.value)))

function toISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function windowBounds(kind: DuelWindow): { start: string; end: string } {
  const now = new Date()
  if (kind === 'semana') {
    const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7))
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    return { start: toISODate(monday), end: toISODate(sunday) }
  }
  if (kind === 'ano') {
    return { start: `${now.getFullYear()}-01-01`, end: `${now.getFullYear()}-12-31` }
  }
  return {
    start: toISODate(new Date(now.getFullYear(), now.getMonth(), 1)),
    end: toISODate(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
  }
}

async function computeDuel(): Promise<void> {
  if (!session.spaceId || members.value.length === 0) {
    duel.value = []
    return
  }
  const { start, end } = windowBounds(duelWindow.value)
  const logs = await db.readingLogs.where('space').equals(session.spaceId).toArray()
  const userBooks = await db.userBooks.where('space').equals(session.spaceId).toArray()
  duel.value = members.value.map((member) => {
    let value = 0
    if (duelMetric.value === 'paginas') {
      value = logs
        .filter((l) => !l.deletedAt && l.owner === member.user && l.date >= start && l.date <= end)
        .reduce((sum, l) => sum + l.pages, 0)
    } else {
      value = userBooks.filter(
        (b) =>
          !b.deletedAt &&
          b.owner === member.user &&
          b.status === 'lido' &&
          b.finishedAt &&
          String(b.finishedAt).slice(0, 10) >= start &&
          String(b.finishedAt).slice(0, 10) <= end,
      ).length
    }
    return { userId: member.user, name: member.name, value }
  })
}

watch([duelWindow, duelMetric], () => void computeDuel())

function pct(item: ChallengeItem): number {
  return Math.min(100, Math.round(((item.progress ?? 0) / Math.max(1, item.target)) * 100))
}

async function load(): Promise<void> {
  if (!session.spaceId) return
  challenges.value = await apiFetch<ChallengeItem[]>('/api/challenges', { query: { space: session.spaceId } })
}

async function create(): Promise<void> {
  if (!session.spaceId || !title.value.trim()) return
  creating.value = true
  try {
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10)
    await apiFetch('/api/challenges', {
      method: 'POST',
      query: { space: session.spaceId },
      body: { title: title.value.trim(), target: target.value, metric: metric.value, period: 'mes', startDate: start, endDate: end },
    })
    title.value = ''
    await load()
  } finally {
    creating.value = false
  }
}

onMounted(async () => {
  await load()
  if (session.spaceId) members.value = await listMembers(session.spaceId)
  await computeDuel()
})
</script>

<template>
  <section class="space-y-5">
    <header>
      <p class="eyebrow flex items-center gap-1.5"><AppIcon name="users" :size="14" /> A dois</p>
      <h1 class="display-hero mt-1 text-3xl">Desafios</h1>
    </header>

    <div v-if="!isSolo" class="card p-5">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <p class="eyebrow flex items-center gap-1.5">
          <AppIcon name="target" :size="14" /> Duelo · {{ windowLabels[duelWindow] }}
        </p>
        <div class="flex gap-1.5">
          <button
            v-for="option in duelWindows"
            :key="option"
            type="button"
            class="chip !py-0.5 text-[0.68rem]"
            :class="{ 'chip-active': duelWindow === option }"
            @click="duelWindow = option"
          >
            {{ option === 'semana' ? 'Semana' : option === 'mes' ? 'Mês' : 'Ano' }}
          </button>
        </div>
      </div>

      <div class="mt-2 flex gap-1.5">
        <button
          v-for="option in duelMetrics"
          :key="option"
          type="button"
          class="chip !py-0.5 text-[0.68rem]"
          :class="{ 'chip-active': duelMetric === option }"
          @click="duelMetric = option"
        >
          {{ option === 'paginas' ? 'Páginas' : 'Livros' }}
        </button>
      </div>

      <ul class="mt-4 space-y-3">
        <li v-for="row in duel" :key="row.userId">
          <div class="flex items-center gap-2">
            <Avatar :name="row.name" :size="24" />
            <span class="flex-1 text-sm font-medium text-ink">{{ row.name }}</span>
            <span v-if="duelLeader?.userId === row.userId" class="chip !py-0 text-[0.6rem] !text-sage !border-sage/40">na frente</span>
            <span class="stat-num text-lg text-oxblood">{{ row.value }}</span>
          </div>
          <div class="mt-1 h-2 overflow-hidden rounded-full bg-paper-sunken">
            <div class="h-full rounded-full bg-oxblood transition-all duration-700" :style="{ width: `${(row.value / duelMax) * 100}%` }" />
          </div>
        </li>
      </ul>
      <p v-if="duel.length && !duelLeader" class="mt-3 text-xs text-ink-mute">Empatados por enquanto — quem ler mais vira o líder.</p>
      <p class="mt-3 text-xs text-ink-mute">Contando {{ metricLabels[duelMetric] }} de cada um — estimule a leitura a dois.</p>
    </div>

    <div v-if="isSolo" class="card-flat p-5 text-sm text-ink-soft">
      Desafios conjuntos aparecem quando o espaço tem mais de uma pessoa.
    </div>

    <form v-else class="card space-y-4 p-4 sm:p-5" @submit.prevent="create">
      <p class="eyebrow">Novo desafio</p>
      <div class="grid gap-3 sm:grid-cols-3">
        <label class="block sm:col-span-1">
          <span class="label">Título</span>
          <input v-model="title" class="input mt-1.5" placeholder="Ex.: ler juntos em outubro" />
        </label>
        <label class="block">
          <span class="label">Métrica</span>
          <select v-model="metric" class="select mt-1.5">
            <option value="livros">Livros</option>
            <option value="paginas">Páginas</option>
          </select>
        </label>
        <label class="block">
          <span class="label">Alvo somado</span>
          <input v-model.number="target" type="number" min="1" class="input mt-1.5" />
        </label>
      </div>
      <div class="flex justify-end">
        <button type="submit" class="btn btn-primary btn-sm" :disabled="creating">
          <AppIcon name="plus" :size="15" /> Criar
        </button>
      </div>
    </form>

    <ul class="space-y-3">
      <li v-for="item in challenges" :key="item.id" class="card p-4">
        <div class="flex items-center justify-between gap-3">
          <span class="font-medium text-ink">{{ item.title }}</span>
          <span
            class="chip !py-0.5 text-[0.68rem]"
            :class="item.status === 'batida' ? '!text-sage !border-sage/40' : ''"
          >
            {{ item.status }}
          </span>
        </div>
        <div class="mt-3 h-2.5 overflow-hidden rounded-full bg-paper-sunken">
          <div
            class="h-full rounded-full bg-gradient-to-r from-saffron to-oxblood transition-all duration-700"
            :style="{ width: `${pct(item)}%` }"
          />
        </div>
        <p class="mt-2 text-xs text-ink-mute">{{ item.progress ?? 0 }} de {{ item.target }} {{ item.metric }}</p>
      </li>
      <li v-if="challenges.length === 0" class="card grid place-items-center gap-2 p-8 text-center">
        <p class="text-sm text-ink-soft">Nenhum desafio criado ainda.</p>
      </li>
    </ul>
  </section>
</template>
