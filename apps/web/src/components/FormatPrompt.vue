<script setup lang="ts">
import AppIcon from './AppIcon.vue'

const props = defineProps<{ open: boolean; title?: string }>()
const emit = defineEmits<{ choose: ['fisico' | 'ereader']; close: [] }>()
</script>

<template>
  <Teleport to="body">
    <div
      v-if="props.open"
      class="fixed inset-0 z-50 grid place-items-center bg-ink/40 px-4 backdrop-blur-sm"
      @click.self="emit('close')"
    >
      <div class="card w-full max-w-sm space-y-4 p-5">
        <div>
          <p class="eyebrow flex items-center gap-1.5"><AppIcon name="books" :size="14" /> Estante</p>
          <h2 class="display-hero mt-1 text-2xl">Qual o formato?</h2>
          <p v-if="title" class="mt-1 text-sm text-ink-soft">“{{ title }}”</p>
        </div>
        <div class="grid grid-cols-2 gap-2">
          <button type="button" class="btn btn-secondary" @click="emit('choose', 'fisico')">
            <AppIcon name="books" :size="16" /> Físico
          </button>
          <button type="button" class="btn btn-secondary" @click="emit('choose', 'ereader')">
            <AppIcon name="camera" :size="16" /> E-reader
          </button>
        </div>
        <div class="flex justify-end">
          <button type="button" class="btn btn-ghost" @click="emit('close')">Cancelar</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
