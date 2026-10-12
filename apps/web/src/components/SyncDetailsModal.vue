<script setup lang="ts">
import { computed, ref } from 'vue'
import { useOnline } from '../composables/useOnline.js'
import { useSyncStore } from '../stores/sync.js'
import { relativeTime } from '../lib/format.js'
import AppIcon from './AppIcon.vue'
import ConfirmDialog from './ConfirmDialog.vue'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()

const sync = useSyncStore()
const { isOnline } = useOnline()
const pendingDiscard = ref<number | null>(null)

const failed = computed(() => sync.failedItems.length)

function entityLabel(entity: string): string {
  const map: Record<string, string> = {
    books: 'Livro',
    user_books: 'Acervo',
    reading_logs: 'Leitura',
    goals: 'Meta',
    goal_periods: 'Período',
    achievements: 'Conquista',
    posts: 'Publicação',
    reactions: 'Curtida',
    comments: 'Comentário',
    challenges: 'Desafio',
  }
  return map[entity] ?? entity
}

async function syncNow(): Promise<void> {
  await sync.sync()
}

async function resetLocal(): Promise<void> {
  const ok = window.confirm(
    'Isto apaga os dados locais deste aparelho (livros, leituras e pendências) e baixa novamente do servidor. Continuar?',
  )
  if (!ok) return
  await sync.hardReset()
  emit('close')
  window.location.reload()
}

async function confirmDiscard(): Promise<void> {
  if (pendingDiscard.value === null) return
  await sync.discardItem(pendingDiscard.value)
  pendingDiscard.value = null
}
</script>

<template>
  <Teleport to="body">
    <div v-if="props.open" class="fixed inset-0 z-50 grid place-items-center bg-ink/40 px-4 backdrop-blur-sm" @click.self="emit('close')">
      <div class="card w-full max-w-md space-y-4 p-5">
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="eyebrow flex items-center gap-1.5"><AppIcon name="sync" :size="14" /> Sincronização</p>
            <h2 class="display-hero mt-1 text-2xl">Estado do envio</h2>
          </div>
          <button class="btn btn-ghost !px-2" aria-label="Fechar" @click="emit('close')">
            <AppIcon name="close" :size="18" />
          </button>
        </div>

        <div class="grid grid-cols-3 gap-2 text-center">
          <div class="rounded-2xl bg-paper-sunken px-2 py-3">
            <p class="eyebrow !text-[0.55rem]">Conexão</p>
            <p class="mt-1 text-sm font-semibold" :class="isOnline ? 'text-sage' : 'text-saffron-600'">
              {{ isOnline ? 'Online' : 'Offline' }}
            </p>
          </div>
          <div class="rounded-2xl bg-paper-sunken px-2 py-3">
            <p class="eyebrow !text-[0.55rem]">Pendentes</p>
            <p class="mt-1 text-sm font-semibold text-ink">{{ sync.pendingCount }}</p>
          </div>
          <div class="rounded-2xl bg-paper-sunken px-2 py-3">
            <p class="eyebrow !text-[0.55rem]">Falhas</p>
            <p class="mt-1 text-sm font-semibold" :class="failed > 0 ? 'text-oxblood' : 'text-ink'">{{ failed }}</p>
          </div>
        </div>

        <p v-if="sync.lastSyncedAt" class="text-center text-xs text-ink-mute">
          Última sincronização {{ relativeTime(sync.lastSyncedAt) }}
        </p>

        <div v-if="!isOnline" class="rounded-2xl bg-saffron/10 px-3 py-2 text-sm text-ink-soft">
          Você está offline. Os itens serão enviados quando a conexão voltar.
        </div>

        <div v-else-if="failed > 0" class="space-y-2">
          <p v-if="sync.lastError" class="text-sm font-semibold text-oxblood">{{ sync.lastError }}</p>
          <ul class="space-y-2">
            <li v-for="item in sync.failedItems" :key="item.id" class="rounded-2xl border border-line p-3">
              <div class="flex items-center justify-between gap-2">
                <span class="text-sm font-semibold text-ink">
                  {{ entityLabel(item.entity) }}
                  <span class="font-normal text-ink-mute">· {{ item.op }}</span>
                </span>
                <span class="chip !py-0 text-[0.6rem]">{{ item.attempts }} tentativa(s)</span>
              </div>
              <p v-if="item.lastError" class="mt-1 text-xs text-ink-mute">{{ item.lastError }}</p>
              <div class="mt-2 flex gap-2">
                <button v-if="item.id !== undefined" class="btn btn-secondary btn-sm" @click="sync.retryItem(item.id)">
                  <AppIcon name="sync" :size="14" /> Tentar
                </button>
                <button v-if="item.id !== undefined" class="btn btn-ghost btn-sm" @click="pendingDiscard = item.id ?? null">
                  <AppIcon name="close" :size="14" /> Descartar
                </button>
              </div>
            </li>
          </ul>
        </div>

        <p v-else class="rounded-2xl bg-sage/10 px-3 py-3 text-center text-sm font-semibold text-sage">
          Tudo sincronizado — nenhuma falha.
        </p>

        <div class="flex justify-end gap-2">
          <button v-if="failed > 0" class="btn btn-secondary" :disabled="!isOnline || sync.syncing" @click="sync.retryAll()">
            Tentar todas
          </button>
          <button v-busy="sync.syncing" class="btn btn-primary" :disabled="!isOnline || sync.syncing" @click="syncNow">
            <AppIcon name="sync" :size="15" /> Sincronizar agora
          </button>
        </div>

        <button class="w-full text-center text-xs text-oxblood underline" @click="resetLocal">
          Limpar dados locais e baixar do servidor
        </button>
      </div>
    </div>
  </Teleport>

  <ConfirmDialog
    :open="pendingDiscard !== null"
    title="Descartar item?"
    message="O item pendente será removido da fila de sincronização sem ser enviado. Continuar?"
    confirm-label="Descartar"
    danger
    @confirm="confirmDiscard"
    @cancel="pendingDiscard = null"
  />
</template>
