<script setup lang="ts">
import { ref, watch } from 'vue'
import AppIcon from './AppIcon.vue'

const props = defineProps<{ open: boolean; title?: string }>()
const emit = defineEmits<{ close: []; confirm: [finishedAt: string | null] }>()

const date = ref(new Date().toISOString().slice(0, 10))

watch(
  () => props.open,
  (open) => {
    if (open) date.value = new Date().toISOString().slice(0, 10)
  },
)
</script>

<template>
  <Teleport to="body">
    <div v-if="props.open" class="fixed inset-0 z-50 grid place-items-center bg-ink/40 px-4 backdrop-blur-sm" @click.self="emit('close')">
      <div class="card w-full max-w-md space-y-4 p-5">
        <div>
          <p class="eyebrow flex items-center gap-1.5"><AppIcon name="check" :size="14" /> Conclusão</p>
          <h2 class="display-hero mt-1 text-2xl">Quando você terminou?</h2>
          <p v-if="title" class="mt-1 text-sm text-ink-soft">“{{ title }}”</p>
        </div>

        <p class="text-sm text-ink-soft">
          A data de conclusão define se o livro conta na <strong>meta de livros</strong> do período. Para livros
          antigos, escolha <strong>não contar</strong>.
        </p>

        <label class="block">
          <span class="label">Data de conclusão</span>
          <input v-model="date" type="date" class="input mt-1.5" />
        </label>

        <div class="flex flex-wrap justify-end gap-2">
          <button type="button" class="btn btn-ghost" @click="emit('confirm', null)">Não contar nas metas</button>
          <button type="button" class="btn btn-secondary" @click="emit('close')">Cancelar</button>
          <button type="button" class="btn btn-primary" @click="emit('confirm', date)">
            <AppIcon name="check" :size="15" /> Terminei nesta data
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
