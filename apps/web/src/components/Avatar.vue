<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ name?: string; src?: string | null; size?: number }>()

const PALETTE = ['#7A2E2E', '#5C6B54', '#3F4A5A', '#8A5A2B', '#4B3A63', '#6B4B3A']

const size = computed(() => props.size ?? 40)
const initial = computed(() => (props.name ?? '?').trim().slice(0, 1).toUpperCase() || '?')
const color = computed(() => {
  const source = props.name ?? ''
  let hash = 0
  for (let i = 0; i < source.length; i++) hash = (hash * 31 + source.charCodeAt(i)) >>> 0
  return PALETTE[hash % PALETTE.length]
})
const dim = computed(() => ({ width: `${size.value}px`, height: `${size.value}px` }))
</script>

<template>
  <img
    v-if="src"
    :src="src"
    :style="dim"
    class="shrink-0 rounded-full object-cover"
    alt=""
  />
  <span
    v-else
    :style="{ ...dim, backgroundColor: color, fontSize: `${Math.round(size * 0.42)}px` }"
    class="grid shrink-0 place-items-center rounded-full font-semibold text-white"
    aria-hidden="true"
  >
    {{ initial }}
  </span>
</template>
