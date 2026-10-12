<script setup lang="ts">
import { computed, ref } from 'vue'
import { useOnline } from '../composables/useOnline.js'
import { useSyncStore } from '../stores/sync.js'
import AppIcon from './AppIcon.vue'
import SyncDetailsModal from './SyncDetailsModal.vue'

const sync = useSyncStore()
const { isOnline } = useOnline()
const open = ref(false)

const failed = computed(() => sync.failedItems.length)

const label = computed(() => {
  if (!isOnline.value) return 'Offline'
  if (sync.syncing) return 'Sincronizando'
  if (failed.value > 0) return `${failed.value} falha(s)`
  if (sync.pendingCount > 0) return `${sync.pendingCount} pendente(s)`
  return 'Sincronizado'
})

const tone = computed(() => {
  if (!isOnline.value) return 'border-saffron/40 text-saffron-600'
  if (failed.value > 0) return 'border-oxblood/40 text-oxblood'
  return 'border-line text-ink-soft'
})
</script>

<template>
  <button
    type="button"
    class="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.68rem] font-semibold"
    :class="tone"
    :title="`Sincronização: ${label}. Toque para ver detalhes`"
    :aria-label="`Status de sincronização: ${label}. Toque para ver detalhes`"
    @click="open = true"
  >
    <AppIcon
      :name="!isOnline ? 'sync' : sync.syncing ? 'sync' : failed > 0 ? 'bell' : 'check'"
      :size="14"
      :class="{ 'animate-spin': sync.syncing }"
    />
    <span class="hidden sm:inline">{{ label }}</span>
  </button>

  <SyncDetailsModal :open="open" @close="open = false" />
</template>
