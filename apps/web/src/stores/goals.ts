import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import {
  computePeriodProgress,
  computeStreak,
  resolvePeriod,
  todayISODate,
  DEFAULT_TIMEZONE,
  type GoalMetric,
  type GoalPeriodUnit,
  type PeriodStatus,
} from '@ml/shared'
import { apiFetch } from '../api/client.js'
import { db } from '../db/schema.js'
import { useSessionStore } from './session.js'

export interface Goal {
  id: string
  metric: GoalMetric
  period: GoalPeriodUnit
  target: number
  weekStart: number
  graceHours: number
  active: boolean
  startsOn: string
  order: number
}

export interface PeriodSnapshot {
  progress: number
  remaining: number
  daysRemaining: number
  status: PeriodStatus
  startDate: string
  endDate: string
  graceUntil: string
}

export interface GoalPeriodSnapshot {
  id: string
  startDate: string
  endDate: string
  target: number
  progress: number
  status: PeriodStatus
}

export interface MilestoneItem {
  key: string
  unlockedAt: string
  payload: { label?: string; kind?: string; threshold?: number }
}

interface GoalRecord {
  id: string
  metric: GoalMetric
  period: GoalPeriodUnit
  target: number
  week_start?: number
  grace_hours?: number
  active?: boolean
  starts_on: string
  order?: number
}

function toGoal(record: GoalRecord): Goal {
  return {
    id: record.id,
    metric: record.metric,
    period: record.period,
    target: record.target,
    weekStart: record.week_start ?? 1,
    graceHours: record.grace_hours ?? 24,
    active: record.active ?? true,
    startsOn: record.starts_on,
    order: record.order ?? 0,
  }
}

export const useGoalsStore = defineStore('goals', () => {
  const session = useSessionStore()
  const goals = ref<Goal[]>([])
  const streak = ref(0)
  const loading = ref(false)

  async function load(): Promise<void> {
    if (!session.spaceId) return
    loading.value = true
    try {
      const records = await apiFetch<GoalRecord[]>('/api/goals', { query: { space: session.spaceId } })
      goals.value = records.map(toGoal)
      await computeAll()
    } finally {
      loading.value = false
    }
  }

  async function computeAll(): Promise<void> {
    const owner = session.user?.id ?? ''
    const logs =
      session.spaceId && owner
        ? (await db.readingLogs.where('space').equals(session.spaceId).toArray()).filter((l) => l.owner === owner)
        : []
    const books =
      session.spaceId && owner
        ? (await db.userBooks.where('space').equals(session.spaceId).toArray()).filter((b) => b.owner === owner)
        : []
    let maxStreak = 0
    for (const goal of goals.value) {
      const bounds = resolvePeriod(goal, todayISODate(DEFAULT_TIMEZONE), DEFAULT_TIMEZONE)
      const result = computePeriodProgress({
        metric: goal.metric,
        target: goal.target,
        period: bounds,
        logs: logs.map((l) => ({ date: l.date, pages: l.pages, deletedAt: l.deletedAt })),
        books: books.map((b) => ({ status: b.status, finishedAt: b.finishedAt, deletedAt: b.deletedAt })),
      })
      progressByGoal.value[goal.id] = { ...result, ...bounds }
      maxStreak = Math.max(maxStreak, computeStreak([{ status: result.status, startDate: bounds.startDate, endDate: bounds.endDate }]))
    }
    streak.value = maxStreak
  }

  const progressByGoal = ref<Record<string, PeriodSnapshot>>({})

  const activeGoals = computed(() =>
    goals.value.filter((goal) => goal.active).map((goal) => ({ goal, period: progressByGoal.value[goal.id] })),
  )

  async function create(input: {
    metric: GoalMetric
    period: GoalPeriodUnit
    target: number
    weekStart: number
    graceHours: number
  }): Promise<void> {
    await apiFetch('/api/goals', {
      method: 'POST',
      query: { space: session.spaceId ?? '' },
      body: { ...input, startsOn: todayISODate(DEFAULT_TIMEZONE) },
    })
    await load()
  }

  async function update(
    id: string,
    patch: { target?: number; weekStart?: number; graceHours?: number; active?: boolean; order?: number },
  ): Promise<void> {
    await apiFetch(`/api/goals/${id}`, {
      method: 'PATCH',
      query: { space: session.spaceId ?? '' },
      body: patch,
    })
    await load()
  }

  async function remove(id: string): Promise<void> {
    await apiFetch(`/api/goals/${id}`, {
      method: 'DELETE',
      query: { space: session.spaceId ?? '' },
    })
    await load()
  }

  async function move(id: string, direction: 'up' | 'down'): Promise<void> {
    const list = [...goals.value]
    const index = list.findIndex((g) => g.id === id)
    const target = direction === 'up' ? index - 1 : index + 1
    if (index < 0 || target < 0 || target >= list.length) return
    const other = list[target]!
    const current = list[index]!
    await update(current.id, { order: target })
    await update(other.id, { order: index })
  }

  const periodsByGoal = ref<Record<string, GoalPeriodSnapshot[]>>({})

  const milestones = ref<MilestoneItem[]>([])
  const milestonesLoading = ref(false)
  const streakStatus = ref<{ canFreeze: boolean; brokenDate: string }>({ canFreeze: false, brokenDate: '' })

  async function loadMilestones(): Promise<void> {
    if (!session.spaceId) return
    milestonesLoading.value = true
    try {
      milestones.value = await apiFetch<MilestoneItem[]>('/api/milestones', { query: { space: session.spaceId } })
    } finally {
      milestonesLoading.value = false
    }
  }

  async function loadStreakStatus(): Promise<void> {
    if (!session.spaceId) return
    streakStatus.value = await apiFetch<{ canFreeze: boolean; brokenDate: string }>('/api/streaks/status', {
      query: { space: session.spaceId },
    })
  }

  async function useFreeze(): Promise<void> {
    if (!session.spaceId || !streakStatus.value.brokenDate) return
    await apiFetch('/api/streaks/freeze', {
      method: 'POST',
      query: { space: session.spaceId },
      body: { date: streakStatus.value.brokenDate },
    })
    await loadStreakStatus()
    await load()
  }
  async function loadPeriods(goalId: string): Promise<void> {
    const records = await apiFetch<
      Array<{ id: string; start_date: string; end_date: string; target: number; progress: number; status: PeriodStatus }>
    >(`/api/goals/${goalId}/periods`, { query: { space: session.spaceId ?? '' } })
    periodsByGoal.value[goalId] = records.map((r) => ({
      id: r.id,
      startDate: String(r.start_date).slice(0, 10),
      endDate: String(r.end_date).slice(0, 10),
      target: r.target,
      progress: r.progress,
      status: r.status,
    }))
  }

  return {
    goals,
    streak,
    loading,
    activeGoals,
    progressByGoal,
    periodsByGoal,
    milestones,
    milestonesLoading,
    streakStatus,
    load,
    loadMilestones,
    loadStreakStatus,
    useFreeze,
    computeAll,
    create,
    update,
    remove,
    move,
    loadPeriods,
  }
})
