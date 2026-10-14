<script setup lang="ts">
import { computed, ref } from 'vue'
import type { GoalMetric } from '@ml/shared'
import { useGoalsStore, type Goal } from '../../stores/goals.js'
import { daysLabel, remainingLabel } from '../../lib/format.js'
import AppIcon from '../../components/AppIcon.vue'
import ConfirmDialog from '../../components/ConfirmDialog.vue'
import SkeletonBlock from '../../components/SkeletonBlock.vue'

withDefaults(defineProps<{ loading?: boolean }>(), { loading: false })

const goals = useGoalsStore()
const rows = computed(() => goals.goals)

const editingId = ref<string | null>(null)
const editTarget = ref<number>(1)
const editWeekStart = ref(1)
const editGrace = ref(24)
const pendingDelete = ref<Goal | null>(null)
const historyOpen = ref<Record<string, boolean>>({})
const periodsLoading = ref<Record<string, boolean>>({})

function label(metric: GoalMetric): string {
  return metric === 'paginas' ? 'páginas' : 'livros'
}
function periodLabel(period: string): string {
  return period === 'mes' ? 'no mês' : period === 'semana' ? 'na semana' : 'no dia'
}
function remainingText(goal: Goal): string {
  const remaining = goals.progressByGoal[goal.id]?.remaining ?? goal.target
  return remainingLabel(goal.metric, remaining)
}
function daysText(goal: Goal): string {
  return daysLabel(goals.progressByGoal[goal.id]?.daysRemaining ?? 0)
}
function pct(progress = 0, target = 1): number {
  return Math.min(100, Math.round((progress / Math.max(1, target)) * 100))
}

function startEdit(goal: Goal): void {
  editingId.value = goal.id
  editTarget.value = goal.target
  editWeekStart.value = goal.weekStart
  editGrace.value = goal.graceHours
}

async function saveEdit(goal: Goal): Promise<void> {
  await goals.update(goal.id, {
    target: editTarget.value,
    weekStart: editWeekStart.value,
    graceHours: editGrace.value,
  })
  editingId.value = null
}

async function toggleActive(goal: Goal): Promise<void> {
  await goals.update(goal.id, { active: !goal.active })
}

function askDelete(goal: Goal): void {
  pendingDelete.value = goal
}

async function confirmDelete(): Promise<void> {
  if (!pendingDelete.value) return
  await goals.remove(pendingDelete.value.id)
  pendingDelete.value = null
}

async function toggleHistory(goal: Goal): Promise<void> {
  historyOpen.value[goal.id] = !historyOpen.value[goal.id]
  if (historyOpen.value[goal.id]) {
    periodsLoading.value[goal.id] = true
    try {
      await goals.loadPeriods(goal.id)
    } finally {
      periodsLoading.value[goal.id] = false
    }
  }
}

function shortDate(value: string): string {
  return new Date(`${value}T00:00:00Z`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}
</script>

<template>
  <ul class="space-y-3">
    <template v-if="loading">
      <li v-for="n in 2" :key="`skeleton-${n}`" class="card space-y-4 p-4">
        <div class="flex items-center justify-between gap-3">
          <SkeletonBlock class="h-4 w-40" />
          <SkeletonBlock class="h-5 w-14" />
        </div>
        <SkeletonBlock class="h-2.5 w-full" />
        <SkeletonBlock class="h-3 w-36" />
      </li>
    </template>

    <li v-for="goal in rows" :key="goal.id" class="card p-4" :class="{ 'opacity-70': !goal.active }">
      <div class="flex items-center justify-between gap-3">
        <span class="text-sm font-semibold text-ink">
          {{ goal.target }} {{ label(goal.metric) }} {{ periodLabel(goal.period) }}
          <span v-if="!goal.active" class="chip !py-0 text-[0.6rem]">inativa</span>
        </span>
        <span
          class="stat-num text-lg"
          :class="goals.progressByGoal[goal.id]?.status === 'batida' ? 'text-sage' : 'text-ink'"
        >
          {{ goals.progressByGoal[goal.id]?.progress ?? 0 }}<span class="text-ink-mute">/{{ goal.target }}</span>
        </span>
      </div>

      <div class="mt-3 h-2.5 overflow-hidden rounded-full bg-paper-sunken">
        <div
          class="h-full rounded-full transition-all duration-700"
          :class="goals.progressByGoal[goal.id]?.status === 'batida' ? 'bg-sage' : 'bg-oxblood'"
          :style="{ width: `${pct(goals.progressByGoal[goal.id]?.progress, goal.target)}%` }"
        />
      </div>
      <p class="mt-2 text-xs text-ink-mute">
        {{ remainingText(goal) }} · {{ daysText(goal) }}
      </p>

      <form v-if="editingId === goal.id" class="mt-3 grid gap-2 sm:grid-cols-3" @submit.prevent="saveEdit(goal)">
        <label class="block text-xs">
          <span class="label">Alvo</span>
          <input v-model.number="editTarget" type="number" min="1" class="input mt-1 !py-1.5 text-sm" />
        </label>
        <label v-if="goal.period === 'semana'" class="block text-xs">
          <span class="label">Início da semana</span>
          <select v-model.number="editWeekStart" class="select mt-1 !py-1.5 text-sm">
            <option :value="0">Domingo</option>
            <option :value="1">Segunda</option>
            <option :value="2">Terça</option>
            <option :value="3">Quarta</option>
            <option :value="4">Quinta</option>
            <option :value="5">Sexta</option>
            <option :value="6">Sábado</option>
          </select>
        </label>
        <label class="block text-xs">
          <span class="label">Carência (h)</span>
          <input v-model.number="editGrace" type="number" min="0" class="input mt-1 !py-1.5 text-sm" />
        </label>
        <div class="flex gap-2 sm:col-span-3">
          <button type="submit" class="btn btn-primary btn-sm flex-1"><AppIcon name="check" :size="15" /> Salvar</button>
          <button type="button" class="btn btn-secondary btn-sm" @click="editingId = null">Cancelar</button>
        </div>
      </form>

      <div v-else class="mt-3 flex flex-wrap items-center gap-2">
        <button class="btn btn-ghost btn-sm !px-2" aria-label="Mover para cima" @click="goals.move(goal.id, 'up')">↑</button>
        <button class="btn btn-ghost btn-sm !px-2" aria-label="Mover para baixo" @click="goals.move(goal.id, 'down')">↓</button>
        <button class="btn btn-secondary btn-sm" @click="startEdit(goal)"><AppIcon name="edit" :size="14" /> Editar</button>
        <button class="btn btn-ghost btn-sm" @click="toggleActive(goal)">
          {{ goal.active ? 'Inativar' : 'Ativar' }}
        </button>
        <button class="btn btn-ghost btn-sm" @click="toggleHistory(goal)">Histórico</button>
        <button class="btn btn-ghost btn-sm text-oxblood" @click="askDelete(goal)">
          <AppIcon name="close" :size="14" /> Excluir
        </button>
      </div>

      <div v-if="historyOpen[goal.id]" class="mt-3">
        <div v-if="periodsLoading[goal.id]" class="space-y-2">
          <SkeletonBlock class="h-9 w-full rounded-lg" />
          <SkeletonBlock class="h-9 w-full rounded-lg" />
        </div>
        <ul
          v-else-if="goals.periodsByGoal[goal.id]?.length"
          class="divide-y divide-line/60 overflow-hidden rounded-xl border border-line"
        >
          <li
            v-for="p in goals.periodsByGoal[goal.id]"
            :key="p.id"
            class="flex items-center justify-between px-3 py-2 text-xs"
          >
            <span class="text-ink-soft">{{ shortDate(p.startDate) }} — {{ shortDate(p.endDate) }}</span>
            <span class="flex items-center gap-2">
              <span class="font-semibold text-ink">{{ p.progress }}/{{ p.target }}</span>
              <span
                class="chip !py-0 text-[0.6rem]"
                :class="
                  p.status === 'batida'
                    ? '!text-sage !border-sage/40'
                    : p.status === 'nao_batida'
                      ? '!text-oxblood !border-oxblood/40'
                      : ''
                "
              >
                {{ p.status === 'nao_batida' ? 'não batida' : p.status }}
              </span>
            </span>
          </li>
        </ul>
        <p v-else class="text-xs text-ink-mute">Sem períodos anteriores.</p>
      </div>
    </li>

    <li v-if="!loading && rows.length === 0" class="card grid place-items-center gap-2 p-8 text-center">
      <p class="text-sm text-ink-soft">Nenhuma meta ainda. Defina uma para acompanhar seu ritmo.</p>
    </li>
  </ul>

  <ConfirmDialog
    :open="pendingDelete !== null"
    title="Excluir meta?"
    :message="
      pendingDelete
        ? `A meta de ${pendingDelete.target} ${label(pendingDelete.metric)} ${periodLabel(pendingDelete.period)} será excluída (junto com seus períodos e conquistas). Esta ação não pode ser desfeita.`
        : ''
    "
    confirm-label="Excluir"
    danger
    @confirm="confirmDelete"
    @cancel="pendingDelete = null"
  />
</template>
