<script setup lang="ts">
import { computed, ref } from 'vue'
import { READ_STATUSES, type ReadStatus } from '@ml/shared'
import type { LocalBook } from '../../db/schema.js'

const props = defineProps<{ book: LocalBook; status?: ReadStatus }>()
const emit = defineEmits<{ changed: [ReadStatus] }>()
const localStatus = ref<ReadStatus>(props.status ?? 'quero_ler')

const statusLabels: Record<ReadStatus, string> = {
  quero_ler: 'Desejo ler',
  lendo: 'Lendo agora',
  lido: 'Já li',
  abandonado: 'Deixei de lado',
}

function changeStatus(value: string): void {
  const next = value as ReadStatus
  localStatus.value = next
  emit('changed', next)
}

const options = computed(() => READ_STATUSES.map((value) => ({ value, label: statusLabels[value] })))
</script>

<template>
  <label class="inline-flex items-center gap-2">
    <span class="sr-only">Status de leitura</span>
    <select
      :value="localStatus"
      class="select !w-auto !py-1.5 text-sm"
      @change="changeStatus(($event.target as HTMLSelectElement).value)"
    >
      <option v-for="option in options" :key="option.value" :value="option.value">
        {{ option.label }}
      </option>
    </select>
  </label>
</template>
