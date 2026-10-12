<script setup lang="ts">
const props = defineProps<{
  open: boolean
  title?: string
  message: string
  confirmLabel?: string
  danger?: boolean
}>()
const emit = defineEmits<{ confirm: []; cancel: [] }>()
</script>

<template>
  <Teleport to="body">
    <div
      v-if="props.open"
      class="fixed inset-0 z-50 grid place-items-center bg-ink/40 px-4 backdrop-blur-sm"
      @click.self="emit('cancel')"
    >
      <div class="card w-full max-w-sm space-y-4 p-5">
        <div>
          <p class="eyebrow">Confirmação</p>
          <h2 class="display-hero mt-1 text-xl">{{ props.title ?? 'Tem certeza?' }}</h2>
        </div>
        <p class="text-sm text-ink-soft">{{ props.message }}</p>
        <div class="flex justify-end gap-2">
          <button type="button" class="btn btn-secondary" @click="emit('cancel')">Cancelar</button>
          <button type="button" class="btn" :class="props.danger ? 'btn-primary' : 'btn-ink'" @click="emit('confirm')">
            {{ props.confirmLabel ?? 'Confirmar' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
