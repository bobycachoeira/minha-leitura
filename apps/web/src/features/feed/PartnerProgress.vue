<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { apiFetch } from '../../api/client.js'
import { useSessionStore } from '../../stores/session.js'
import { remainingLabel } from '../../lib/format.js'
import type { SpaceMemberItem } from '../../api/space-api.js'
import AppIcon from '../../components/AppIcon.vue'
import SkeletonBlock from '../../components/SkeletonBlock.vue'

interface GoalPeriodItem {
  id: string
  target: number
  progress: number
  status: string
  metric?: 'paginas' | 'livros' | null
  start_date: string
  end_date: string
}

interface DashboardData {
  streak: number
  activeGoals: GoalPeriodItem[]
}

const props = defineProps<{ members: SpaceMemberItem[] }>()
const session = useSessionStore()

const others = computed(() => props.members.filter((member) => !member.isSelf))
const selected = ref('')
const data = ref<DashboardData | null>(null)
const loading = ref(false)

async function load(ownerId: string): Promise<void> {
  if (!session.spaceId || !ownerId) return
  loading.value = true
  try {
    data.value = await apiFetch<DashboardData>('/api/dashboard', {
      query: { space: session.spaceId, owner: ownerId },
    })
  } finally {
    loading.value = false
  }
}

watch(selected, (value) => {
  if (value) void load(value)
})

onMounted(() => {
  if (others.value[0]) selected.value = others.value[0].user
})
</script>

<template>
  <section v-if="others.length > 0" class="card-flat p-4">
    <div class="flex items-center justify-between gap-3">
      <p class="eyebrow flex items-center gap-1.5"><AppIcon name="users" :size="14" /> Progresso do par</p>
      <select v-if="others.length > 1" v-model="selected" class="select !w-auto !py-1 text-xs">
        <option v-for="member in others" :key="member.id" :value="member.user">{{ member.user }}</option>
      </select>
    </div>

    <div v-if="loading" class="mt-3 space-y-2.5">
      <SkeletonBlock class="h-9 w-24 rounded-xl" />
      <SkeletonBlock class="h-4 w-40" />
    </div>
    <div v-else class="mt-3 flex items-baseline gap-2">
      <span class="stat-num text-3xl text-oxblood">{{ data?.streak ?? 0 }}</span>
      <span class="text-sm text-ink-soft">períodos em sequência</span>
    </div>

    <div v-if="loading" class="mt-3 space-y-3">
      <div v-for="n in 2" :key="`skeleton-${n}`" class="space-y-2">
        <div class="flex items-center justify-between">
          <SkeletonBlock class="h-4 w-24" />
          <SkeletonBlock class="h-4 w-10" />
        </div>
        <SkeletonBlock class="h-3 w-36" />
      </div>
    </div>
    <ul v-else class="mt-3 space-y-2">
      <li
        v-for="goal in data?.activeGoals ?? []"
        :key="goal.id"
        class="text-sm text-ink-soft"
      >
        <div class="flex items-center justify-between">
          <span>Meta de {{ goal.target }}</span>
          <span class="font-semibold text-ink">{{ goal.progress }}/{{ goal.target }}</span>
        </div>
        <p class="text-[0.62rem] text-ink-mute">
          {{ remainingLabel(goal.metric ?? 'paginas', Math.max(0, goal.target - goal.progress)) }}
        </p>
      </li>
      <li v-if="!(data?.activeGoals ?? []).length" class="text-sm text-ink-mute">Sem metas ativas.</li>
    </ul>
  </section>
</template>
