<script setup lang="ts">
import { computed } from 'vue'
import { addDaysISO, eachDayISO, todayISODate, DEFAULT_TIMEZONE } from '@ml/shared'

const props = withDefaults(defineProps<{ data: Array<{ date: string; pages: number }>; days?: number }>(), {
  days: 14,
})

const TRACK = 120 // px — fixed bar track height

const byDate = computed(() => new Map(props.data.map((d) => [d.date, d.pages])))

/** Fixed window of the last N days (empty days included as zero). */
const windowDays = computed(() => {
  const today = todayISODate(DEFAULT_TIMEZONE)
  const start = addDaysISO(today, -(props.days - 1))
  return eachDayISO(start, today).map((date) => ({ date, pages: byDate.value.get(date) ?? 0 }))
})

const max = computed(() => Math.max(1, ...windowDays.value.map((d) => d.pages)))
const total = computed(() => windowDays.value.reduce((sum, d) => sum + d.pages, 0))

const labelEvery = computed(() => (props.days > 31 ? 7 : props.days > 14 ? 3 : 1))

function barHeight(pages: number): number {
  if (pages <= 0) return 3
  return Math.max(8, Math.round((pages / max.value) * TRACK))
}
function weekday(date: string): string {
  return new Intl.DateTimeFormat('pt-BR', { weekday: 'narrow' }).format(new Date(`${date}T00:00:00Z`))
}
function dayMonth(date: string): string {
  return `${date.slice(8, 10)}/${date.slice(5, 7)}`
}
</script>

<template>
  <div class="space-y-3">
    <div class="flex items-baseline justify-between">
      <p class="text-xs text-ink-mute">Últimos {{ days }} dias</p>
      <p class="text-xs text-ink-soft">
        <span class="stat-num text-lg text-ink">{{ total }}</span> páginas
      </p>
    </div>

    <div class="flex items-end gap-1 overflow-x-auto" role="img" :aria-label="`Páginas lidas por dia (últimos ${days} dias)`">
      <div
        v-for="(item, index) in windowDays"
        :key="item.date"
        class="flex flex-1 flex-col items-center gap-1"
        :title="`${dayMonth(item.date)} · ${item.pages} páginas`"
      >
        <span
          class="h-3 text-[0.55rem] font-semibold leading-3"
          :class="item.pages > 0 ? 'text-ink' : 'text-transparent'"
        >
          {{ item.pages > 0 ? item.pages : '0' }}
        </span>
        <div class="flex w-full items-end justify-center" :style="{ height: `${TRACK}px` }">
          <div
            class="w-full rounded-t-md transition-all duration-700"
            :class="item.pages > 0 ? 'bg-gradient-to-t from-oxblood to-oxblood/70' : 'bg-paper-sunken'"
            :style="{ height: `${barHeight(item.pages)}px` }"
          />
        </div>
        <span
          class="text-[0.55rem] font-semibold uppercase"
          :class="index === windowDays.length - 1 ? 'text-oxblood' : 'text-ink-mute'"
        >
          {{ index % labelEvery === 0 || index === windowDays.length - 1 ? weekday(item.date) : '' }}
        </span>
      </div>
    </div>
  </div>
</template>
