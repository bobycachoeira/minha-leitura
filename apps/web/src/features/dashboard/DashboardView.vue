<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { apiFetch } from '../../api/client.js'
import { createPost } from '../../api/feed-api.js'
import { formatDayMonth } from '../../lib/format.js'
import { downloadImage, shareImage } from '../../lib/share.js'
import { useLibraryStore } from '../../stores/library.js'
import { useGoalsStore } from '../../stores/goals.js'
import { useSessionStore } from '../../stores/session.js'
import { useToastsStore } from '../../stores/toasts.js'
import { useStreakCard } from './useStreakCard.js'
import GoalForm from '../goals/GoalForm.vue'
import GoalProgress from '../goals/GoalProgress.vue'
import PagesChart from './PagesChart.vue'
import AppIcon from '../../components/AppIcon.vue'
import PublishPrompt from '../../components/PublishPrompt.vue'
import SkeletonBlock from '../../components/SkeletonBlock.vue'

interface DashboardData {
  streak: number
  dayStreak: { current: number; best: number }
  pagesByDay: Array<{ date: string; pages: number }>
}

const library = useLibraryStore()
const goals = useGoalsStore()
const session = useSessionStore()
const toasts = useToastsStore()
const { render, toBlob } = useStreakCard()

const dashboard = ref<DashboardData>({ streak: 0, dayStreak: { current: 0, best: 0 }, pagesByDay: [] })
const dashboardLoading = ref(true)
const showGoalForm = ref(false)
const chartDays = ref(14)
const recovering = ref(false)
const sharing = ref(false)
const promptOpen = ref(false)

const canShare = computed(
  () => dashboard.value.dayStreak.current > 0 || dashboard.value.dayStreak.best > 0 || dashboard.value.streak > 0,
)

const shareText = computed(() => {
  const { current, best } = dashboard.value.dayStreak
  const parts: string[] = []
  if (current > 0) {
    parts.push(`Estou há ${current} ${current === 1 ? 'dia' : 'dias'} seguido${current === 1 ? '' : 's'} lendo!`)
  }
  if (best > 0) parts.push(`Meu recorde é ${best} ${best === 1 ? 'dia' : 'dias'}.`)
  const periods = dashboard.value.streak
  if (periods > 0) {
    parts.push(`${periods} ${periods === 1 ? 'período de meta batido' : 'períodos de meta batidos'} em sequência.`)
  }
  return parts.join(' ') || 'Registrando minhas leituras!'
})

async function loadDashboard(): Promise<void> {
  if (!session.spaceId) {
    dashboardLoading.value = false
    return
  }
  try {
    dashboard.value = await apiFetch<DashboardData>('/api/dashboard', { query: { space: session.spaceId } })
  } finally {
    dashboardLoading.value = false
  }
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

async function shareStreak(format: 'square' | 'story'): Promise<void> {
  sharing.value = true
  try {
    const dataUrl = render(
      {
        current: dashboard.value.dayStreak.current,
        best: dashboard.value.dayStreak.best,
        periodStreak: dashboard.value.streak,
      },
      format,
    )
    if (!dataUrl) return
    const blob = await toBlob(dataUrl)
    const filename = format === 'story' ? 'constancia-story.png' : 'constancia.png'
    const ok = await shareImage(blob, filename, shareText.value)
    if (!ok) downloadImage(blob, filename)
  } finally {
    sharing.value = false
  }
}

async function publishStreak(visibility: 'space' | 'public', text: string): Promise<void> {
  promptOpen.value = false
  if (!session.spaceId) return
  try {
    await createPost(session.spaceId, 'streak', text, undefined, visibility)
    toasts.push('Publicado no mural!')
  } catch {
    toasts.push('Não foi possível publicar agora.', { kind: 'error' })
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
      <div class="card relative overflow-hidden p-6" :aria-busy="dashboardLoading">
        <div class="absolute -right-6 -top-8 text-[7rem] leading-none text-oxblood/5" aria-hidden="true">✓</div>
        <p class="eyebrow">Sequência atual</p>
        <div v-if="dashboardLoading" class="mt-1 space-y-2.5">
          <SkeletonBlock class="h-12 w-24 rounded-xl" />
          <SkeletonBlock class="h-4 w-44" />
        </div>
        <div v-else class="mt-1 flex items-baseline gap-2">
          <span class="stat-num text-5xl text-oxblood">{{ dashboard.streak }}</span>
          <span class="text-sm text-ink-soft">período(s) batido(s) em sequência</span>
        </div>
      </div>

      <div class="card relative overflow-hidden p-6" :aria-busy="dashboardLoading">
        <div class="absolute -right-5 -top-6 text-oxblood/5" aria-hidden="true"><AppIcon name="flame" :size="110" /></div>
        <p class="eyebrow flex items-center gap-1.5">
          <AppIcon name="flame" :size="14" /> Dias seguidos lendo
        </p>
        <div v-if="dashboardLoading" class="mt-1 space-y-2.5">
          <SkeletonBlock class="h-12 w-24 rounded-xl" />
          <SkeletonBlock class="h-4 w-44" />
          <SkeletonBlock class="h-3.5 w-32" />
        </div>
        <template v-else>
          <div class="mt-1 flex items-baseline gap-2">
            <span class="stat-num text-5xl text-oxblood">{{ dashboard.dayStreak.current }}</span>
            <span class="text-sm text-ink-soft">dia(s) em sequência</span>
          </div>
          <p class="mt-2 flex items-center gap-1.5 text-xs text-ink-mute">
            <AppIcon name="award" :size="13" />
            Recorde: <strong class="text-ink">{{ dashboard.dayStreak.best }} dia(s)</strong>
          </p>
        </template>
      </div>
    </div>

    <div v-if="!dashboardLoading" class="flex flex-wrap gap-2">
      <button class="btn btn-primary btn-sm" :disabled="!canShare" @click="promptOpen = true">
        <AppIcon name="sparkles" :size="15" /> Publicar no mural
      </button>
      <button
        v-busy="sharing"
        class="btn btn-ink btn-sm"
        :disabled="sharing || !canShare"
        @click="shareStreak('square')"
      >
        <AppIcon name="flame" :size="15" /> Compartilhar
      </button>
      <button class="btn btn-secondary btn-sm" :disabled="sharing || !canShare" @click="shareStreak('story')">
        Story 9:16
      </button>
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
      <GoalProgress :loading="dashboardLoading" />
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
      <div v-if="dashboardLoading" class="space-y-3">
        <SkeletonBlock class="h-3 w-24" />
        <SkeletonBlock class="h-32 w-full rounded-xl" />
      </div>
      <PagesChart v-else :data="dashboard.pagesByDay" :days="chartDays" />
    </div>

    <PublishPrompt
      :open="promptOpen"
      title="Compartilhar constância"
      :default-text="shareText"
      @close="promptOpen = false"
      @publish="publishStreak"
    />
  </section>
</template>
