<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useToastsStore } from '../stores/toasts.js'
import AppIcon from './AppIcon.vue'

const toasts = useToastsStore()
const router = useRouter()

function activate(id: number, to?: unknown): void {
  if (to) void router.push(to as never)
  toasts.dismiss(id)
}
</script>

<template>
  <Teleport to="body">
    <div class="pointer-events-none fixed inset-x-0 top-16 z-[60] flex flex-col items-center gap-2 px-4">
      <TransitionGroup name="page">
        <button
          v-for="t in toasts.items"
          :key="t.id"
          type="button"
          class="pointer-events-auto flex items-center gap-2 rounded-full border px-4 py-2 shadow-lift transition"
          :class="
            t.kind === 'error'
              ? 'border-oxblood/50 bg-oxblood/10 text-oxblood'
              : 'border-line bg-paper-raised hover:bg-paper-sunken'
          "
          role="status"
          @click="activate(t.id, t.to)"
        >
          <AppIcon :name="t.kind === 'error' ? 'bell' : t.kind === 'success' ? 'award' : 'bell'" :size="16" />
          <span class="text-sm font-medium">{{ t.message }}</span>
          <span v-if="t.to" class="text-xs font-semibold text-oxblood">Ver →</span>
        </button>
      </TransitionGroup>
    </div>
  </Teleport>
</template>
