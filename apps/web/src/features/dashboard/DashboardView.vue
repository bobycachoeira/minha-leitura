<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { apiFetch } from '../../api/client.js'
import { formatDayMonth } from '../../lib/format.js'
import { useLibraryStore } from '../../stores/library.js'
import { useGoalsStore } from '../../stores/goals.js'
import { useSessionStore } from '../../stores/session.js'
import GoalForm from '../goals/GoalForm.vue'
import GoalProgress from '../goals/GoalProgress.vue'
import PagesChart from './PagesChart.vue'
import AppIcon from '../../components/AppIcon.vue'

interface DashboardData {
  streak: number
  dayStreak: { current: number; best: number }
  pagesByDay: Array<{ date: string; pages: number }>
}

const library = useLibraryStore()
const goals = useGoalsStore()
const session = useSessionStore()

const dashboard = ref<DashboardData>({ streak: 0, dayStreak: { current: 0, best: 0 }, pagesByDay: [] })
const showGoalForm = ref(false)
const chartDays = ref(14)
const recovering = ref(false)

async function loadDashboard(): Promise<void> {
  if (!session.spaceId) return
  dashboard.value = await apiFetch<DashboardData>('/api/dashboard', { query: { space: session.spaceId } })
}

function openForm(): void {
  showGoalForm.value = true
}

async function onCreated(): Promise<void> {
  showGoalForm.value = false
  await goals.load()
  await loadDashboard()
}

async function recoverStreak(): Promise<void> {
  recovering.value = true
  try {
    await goals.useFreeze()
    await loadDashboard()
  } finally {
    recovering.value = false
  }
}

onMounted(async () => {
  await library.load()
  await goals.load()
  await goals.loadStreakStatus()
  await loadDashboard()
})
</script>

<template>
  <section class="space-y-6">
    <header class="flex items-end justify-between gap-3">
      <div>
        <p class="eyebrow">Constância</p>
        <h1 class="display-hero mt-1 text-3xl">Metas</h1>
      </div>
      <button v-if="!showGoalForm" class="btn btn-primary btn-sm" @click="openForm">
        <AppIcon name="plus" :size="16" /> Meta
      </button>
    </header>

    <div class="grid gap-3 sm:grid-cols-2">
      <div class="card relative overflow-hidden p-6">
        <div class="absolute -right-6 -top-8 text-[7rem] leading-none text-oxblood/5">✓</div>
        <p class="eyebrow">Sequência atual</p>
        <div class="mt-1 flex items-baseline gap-2">
          <span class="stat-num text-5xl text-oxblood">{{ dashboard.streak }}</span>
          <span class="text-sm text-ink-soft">período(s) batido(s) em sequência</span>
        </div>
      </div>

      <div class="card relative overflow-hidden p-6">
        <div class="absolute -right-5 -top-6 text-oxblood/5"><AppIcon name="flame" :size="110" /></div>
        <p class="eyebrow flex items-center gap-1.5">
          <AppIcon name="flame" :size="14" /> Dias seguidos lendo
        </p>
        <div class="mt-1 flex items-baseline gap-2">
          <span class="stat-num text-5xl text-oxblood">{{ dashboard.dayStreak.current }}</span>
          <span class="text-sm text-ink-soft">dia(s) em sequência</span>
        </div>
        <p class="mt-2 flex items-center gap-1.5 text-xs text-ink-mute">
          <AppIcon name="award" :size="13" />
          Recorde: <strong class="text-ink">{{ dashboard.dayStreak.best }} dia(s)</strong>
        </p>
      </div>
    </div>

    <div v-if="goals.streakStatus.brokenDate" class="card p-4 sm:p-5">
      <p class="eyebrow flex items-center gap-1.5"><AppIcon name="target" :size="14" /> Sequência</p>
      <p class="mt-1 text-sm text-ink-soft">
        Sua sequência quebrou em <strong class="text-ink">{{ formatDayMonth(goals.streakStatus.brokenDate) }}</strong>.
      </p>
      <button
        v-if="goals.streakStatus.canFreeze"
        v-busy="recovering"
        class="btn btn-secondary btn-sm mt-2"
        :disabled="recovering"
        @click="recoverStreak"
      >
        <AppIcon name="check" :size="15" /> Recuperar sequência (congelar 1 dia)
      </button>
      <p v-else class="mt-1 text-xs text-ink-mute">Você já usou um congelamento nos últimos 7 dias.</p>
    </div>

    <Transition name="page">
      <GoalForm v-if="showGoalForm" @submit="onCreated" @cancel="showGoalForm = false" />
    </Transition>

    <div class="space-y-3">
      <h2 class="eyebrow">Metas ativas</h2>
      <GoalProgress />
    </div>

    <div class="card p-5">
      <div class="mb-4 flex items-center justify-between gap-3">
        <h2 class="eyebrow">Ritmo de leitura</h2>
        <div class="flex gap-1.5">
          <button
            v-for="option in [14, 30, 90]"
            :key="option"
            type="button"
            class="chip !py-0.5 text-[0.68rem]"
            :class="{ 'chip-active': chartDays === option }"
            @click="chartDays = option"
          >
            {{ option }}d
          </button>
        </div>
      </div>
      <PagesChart :data="dashboard.pagesByDay" :days="chartDays" />
    </div>
  </section>
</template>
