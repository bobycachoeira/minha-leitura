<script setup lang="ts">
import { ref, watch } from 'vue'
import AppIcon from './AppIcon.vue'

const props = defineProps<{ open: boolean; title?: string; defaultText: string }>()
const emit = defineEmits<{ close: []; publish: [visibility: 'space' | 'public', text: string] }>()

const text = ref(props.defaultText)
const visibility = ref<'space' | 'public'>('space')

watch(
  () => props.open,
  (open) => {
    if (open) {
      text.value = props.defaultText
      visibility.value = 'space'
    }
  },
)

function publish(): void {
  const value = text.value.trim()
  if (!value) return
  emit('publish', visibility.value, value)
}
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-50 grid place-items-center bg-ink/40 px-4 backdrop-blur-sm" @click.self="emit('close')">
      <div class="card w-full max-w-md space-y-4 p-5">
        <div>
          <p class="eyebrow flex items-center gap-1.5"><AppIcon name="sparkles" :size="14" /> Compartilhar</p>
          <h2 class="display-hero mt-1 text-2xl">{{ title ?? 'Publicar no mural?' }}</h2>
        </div>
        <textarea v-model="text" rows="3" class="textarea" maxlength="300" />
        <div class="flex items-center gap-1.5">
          <button type="button" class="chip !py-0.5 text-[0.68rem]" :class="{ 'chip-active': visibility === 'space' }" @click="visibility = 'space'">
            <AppIcon name="space" :size="12" /> Meu espaço
          </button>
          <button type="button" class="chip !py-0.5 text-[0.68rem]" :class="{ 'chip-active': visibility === 'public' }" @click="visibility = 'public'">
            <AppIcon name="users" :size="12" /> Público
          </button>
        </div>
        <div class="flex justify-end gap-2">
          <button type="button" class="btn btn-secondary" @click="emit('close')">Agora não</button>
          <button type="button" class="btn btn-primary" :disabled="!text.trim()" @click="publish">
            <AppIcon name="sparkles" :size="15" /> Publicar
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
