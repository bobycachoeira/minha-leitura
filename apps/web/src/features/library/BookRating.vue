<script setup lang="ts">
const props = defineProps<{ rating: number | null }>()
const emit = defineEmits<{ change: [number | null] }>()

/** Width (%) of the filled overlay for star `index` (1..5). */
function fillPercent(index: number): number {
  const rating = props.rating ?? 0
  const value = (rating - (index - 1)) * 100
  return Math.max(0, Math.min(100, value))
}

function set(value: number): void {
  // Clicking the current value clears the rating.
  emit('change', props.rating === value ? null : value)
}
</script>

<template>
  <div class="inline-flex items-center gap-1">
    <span class="inline-flex items-center gap-0.5">
      <span v-for="i in 5" :key="i" class="relative inline-block h-6 w-6 text-xl leading-none">
        <span class="absolute inset-0 grid place-items-center text-line" aria-hidden="true">★</span>
        <span
          class="absolute inset-y-0 left-0 overflow-hidden text-saffron-600"
          :style="{ width: `${fillPercent(i)}%` }"
          aria-hidden="true"
        >
          <span class="grid h-6 w-6 place-items-center">★</span>
        </span>
        <button
          type="button"
          class="absolute inset-y-0 left-0 w-1/2"
          :aria-label="`${i - 0.5} estrelas`"
          @click="set(i - 0.5)"
        />
        <button
          type="button"
          class="absolute inset-y-0 right-0 w-1/2"
          :aria-label="`${i} estrelas`"
          @click="set(i)"
        />
      </span>
    </span>
    <span class="ml-1 text-xs text-ink-mute">{{ rating ?? '—' }}</span>
  </div>
</template>
