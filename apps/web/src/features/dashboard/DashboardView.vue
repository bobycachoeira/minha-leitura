<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { apiFetch } from '../../api/client.js'
import { useLibraryStore } from '../../stores/library.js'
import { useGoalsStore } from '../../stores/goals.js'
import { useSessionStore } from '../../stores/session.js'
import GoalForm from '../goals/GoalForm.vue'
import GoalProgress from '../goals/GoalProgress.vue'
import PagesChart from './PagesChart.vue'
import AppIcon from '../../components/AppIcon.vue'

interface DashboardData {
  streak: number
  pagesByDay: Array<{ date: string; pages: number }>
}

const library = useLibraryStore()
const goals = useGoalsStore()
const session = useSessionStore()

const dashboard = ref<DashboardData>({ streak: 0, pagesByDay: [] })
const showGoalForm = ref(false)
const chartDays = ref(14)

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

onMounted(async () => {
  await library.load()
  await goals.load()
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

    <div class="card relative overflow-hidden p-6">
      <div class="absolute -right-6 -top-8 text-[7rem] leading-none text-oxblood/5">✓</div>
      <p class="eyebrow">Sequência atual</p>
      <div class="mt-1 flex items-baseline gap-2">
        <span class="stat-num text-5xl text-oxblood">{{ dashboard.streak }}</span>
        <span class="text-sm text-ink-soft">período(s) batido(s) em sequência</span>
      </div>
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
