<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from './AppIcon.vue'
import { useCardTheme } from '../composables/useCardTheme.js'

const props = defineProps<{
  kind: 'meta_batida' | 'meta_nao_batida'
  payload: {
    metric: 'paginas' | 'livros'
    period?: string
    target: number
    progress: number
    startDate: string
    endDate: string
    streak?: number
    books?: string[]
  }
}>()

const { theme } = useCardTheme()

const unit = computed(() => (props.payload.metric === 'paginas' ? 'páginas' : 'livros'))
const periodLabel = computed(() => {
  const p = props.payload.period
  return p === 'mes' ? 'no mês' : p === 'semana' ? 'na semana' : p === 'dia' ? 'no dia' : ''
})
const pct = computed(() =>
  Math.min(100, Math.round((props.payload.progress / Math.max(1, props.payload.target)) * 100)),
)
const books = computed(() => props.payload.books ?? [])
const defeated = computed(() => props.kind === 'meta_nao_batida')
const accent = computed(() => (defeated.value ? theme.value.canvas.barDefeated : theme.value.ui.bar))

function shortDate(value: string): string {
  const d = new Date(`${value.slice(0, 10)}T00:00:00Z`)
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(d)
}
</script>

<template>
  <div
    class="overflow-hidden rounded-2xl border"
    :style="{ borderColor: theme.ui.border, backgroundColor: theme.ui.surface }"
  >
    <div
      class="flex items-center justify-between px-4 py-2.5 text-xs font-semibold"
      :style="{ backgroundColor: theme.ui.headerBg, color: theme.ui.headerText }"
    >
      <span class="flex items-center gap-1.5">
        <AppIcon :name="defeated ? 'sparkles' : 'award'" :size="15" />
        {{ defeated ? 'Quase lá' : 'Meta batida' }}
      </span>
      <span>{{ shortDate(payload.startDate) }} — {{ shortDate(payload.endDate) }}</span>
    </div>

    <div class="space-y-3 p-5 text-center" :style="{ color: theme.ui.sub }">
      <p class="display-hero text-5xl" :style="{ color: accent }">
        {{ payload.progress }}<span class="text-xl" :style="{ color: theme.ui.sub, opacity: 0.6 }">/{{ payload.target }}</span>
      </p>
      <p class="text-sm">{{ unit }} {{ periodLabel }}</p>

      <div class="h-2 overflow-hidden rounded-full" :style="{ backgroundColor: theme.ui.barTrack }">
        <div class="h-full rounded-full" :style="{ width: `${pct}%`, backgroundColor: accent }" />
      </div>

      <p class="text-xs" :style="{ opacity: 0.75 }">Sequência: {{ payload.streak ?? 0 }} período(s)</p>
      <p v-if="books.length" class="text-sm italic">{{ books.join(' · ') }}</p>

      <slot />
    </div>
  </div>
</template>
