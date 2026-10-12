<script setup lang="ts">
import { ref } from 'vue'
import type { GoalMetric, GoalPeriodUnit } from '@ml/shared'
import { useGoalsStore } from '../../stores/goals.js'
import AppIcon from '../../components/AppIcon.vue'

const emit = defineEmits<{ submit: []; cancel: [] }>()

const goals = useGoalsStore()
const metric = ref<GoalMetric>('paginas')
const period = ref<GoalPeriodUnit>('semana')
const target = ref(140)
const weekStart = ref(1)
const graceHours = ref(24)
const saving = ref(false)

async function submit(): Promise<void> {
  saving.value = true
  try {
    await goals.create({
      metric: metric.value,
      period: period.value,
      target: target.value,
      weekStart: weekStart.value,
      graceHours: graceHours.value,
    })
    emit('submit')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <form class="card space-y-4 p-4 sm:p-5" @submit.prevent="submit">
    <p class="eyebrow flex items-center gap-1.5"><AppIcon name="target" :size="14" /> Nova meta</p>
    <div class="grid gap-3 sm:grid-cols-2">
      <label class="block">
        <span class="label">Métrica</span>
        <select v-model="metric" class="select mt-1.5">
          <option value="paginas">Páginas</option>
          <option value="livros">Livros</option>
        </select>
      </label>
      <label class="block">
        <span class="label">Período</span>
        <select v-model="period" class="select mt-1.5">
          <option value="dia">Por dia</option>
          <option value="semana">Por semana</option>
          <option value="mes">Por mês</option>
        </select>
      </label>
      <label class="block">
        <span class="label">Alvo por período</span>
        <input v-model.number="target" type="number" min="1" class="input mt-1.5" />
      </label>
      <label v-if="period === 'semana'" class="block">
        <span class="label">Semana começa em</span>
        <select v-model.number="weekStart" class="select mt-1.5">
          <option :value="0">Domingo</option>
          <option :value="1">Segunda</option>
          <option :value="2">Terça</option>
          <option :value="3">Quarta</option>
          <option :value="4">Quinta</option>
          <option :value="5">Sexta</option>
          <option :value="6">Sábado</option>
        </select>
      </label>
      <label class="block">
        <span class="label">Carência no fechamento (h)</span>
        <input v-model.number="graceHours" type="number" min="0" class="input mt-1.5" />
      </label>
    </div>
    <div class="flex justify-end gap-2">
      <button type="button" class="btn btn-secondary" @click="emit('cancel')">Cancelar</button>
      <button v-busy="saving" type="submit" class="btn btn-primary" :disabled="saving">
        <AppIcon name="check" :size="16" /> Criar meta
      </button>
    </div>
  </form>
</template>
