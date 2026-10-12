<script setup lang="ts">
import { ref } from 'vue'
import { useErrorsStore } from '../../stores/errors.js'
import { useToastsStore } from '../../stores/toasts.js'
import { useSyncStore } from '../../stores/sync.js'
import { relativeTime } from '../../lib/format.js'
import AppIcon from '../../components/AppIcon.vue'
import ConfirmDialog from '../../components/ConfirmDialog.vue'

const errors = useErrorsStore()
const toasts = useToastsStore()
const sync = useSyncStore()
const showClear = ref(false)

function clear(): void {
  errors.clear()
  showClear.value = false
}

function buildReport(): string {
  const failed = sync.failedItems.map((i) => `    · ${i.entity}/${i.op} (${i.attempts}x): ${i.lastError ?? '—'}`)
  const env = [
    'Minha Leitura — diagnóstico',
    `Gerado em: ${new Date().toISOString()}`,
    `Versão: ${__APP_VERSION__} (build ${__BUILD_ID__})`,
    `App: ${window.location.origin}`,
    `Online: ${navigator.onLine ? 'sim' : 'não'}`,
    `Plataforma: ${navigator.platform || '—'}`,
    `Idioma: ${navigator.language}`,
    `Tela: ${screen.width}x${screen.height} @${window.devicePixelRatio}x`,
    `Tema: ${document.documentElement.getAttribute('data-theme') ?? 'light'}`,
    `User agent: ${navigator.userAgent}`,
    '',
    'Sincronização:',
    `  Pendentes: ${sync.pendingCount}`,
    `  Falhas: ${sync.failedItems.length}`,
    `  Última sincronização: ${sync.lastSyncedAt ?? '—'}`,
    `  Cursor: ${sync.cursor}`,
    `  Último erro: ${sync.lastError ?? '—'}`,
    ...(failed.length ? ['  Itens com falha:', ...failed] : []),
    '',
    `Erros (${errors.items.length}):`,
  ]
  const list = errors.items.map((e) => `- [${e.at}] (${e.source}) ${e.message}`)
  return [...env, ...list].join('\n')
}

async function copyReport(): Promise<void> {
  const text = buildReport()
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    const area = document.createElement('textarea')
    area.value = text
    document.body.appendChild(area)
    area.select()
    document.execCommand('copy')
    area.remove()
  }
  toasts.push('Diagnóstico copiado.')
}
</script>

<template>
  <section class="space-y-5">
    <header class="flex items-end justify-between gap-3">
      <div>
        <p class="eyebrow flex items-center gap-1.5"><AppIcon name="bell" :size="14" /> Diagnóstico</p>
        <h1 class="display-hero mt-1 text-3xl">Erros recentes</h1>
      </div>
      <div class="flex shrink-0 gap-2">
        <button class="btn btn-secondary btn-sm" @click="copyReport">
          <AppIcon name="edit" :size="14" /> Copiar
        </button>
        <button v-if="errors.items.length" class="btn btn-ghost btn-sm text-oxblood" @click="showClear = true">Limpar</button>
      </div>
    </header>

    <div v-if="errors.items.length === 0" class="card grid place-items-center gap-2 p-10 text-center">
      <AppIcon name="check" :size="26" class="text-sage" />
      <p class="text-sm text-ink-soft">Nenhum erro registrado. Tudo certo por aqui.</p>
    </div>

    <ul v-else class="space-y-2">
      <li v-for="item in errors.items" :key="item.id" class="card p-3">
        <div class="flex items-center justify-between gap-2">
          <span class="chip !py-0 text-[0.6rem]">{{ item.source }}</span>
          <span class="text-xs text-ink-mute">{{ relativeTime(item.at) }}</span>
        </div>
        <p class="mt-1.5 break-words font-mono text-xs text-ink-soft">{{ item.message }}</p>
      </li>
    </ul>

    <p class="text-xs text-ink-mute">
      “Copiar” inclui data/hora, dispositivo e navegador — é só colar e mandar. Os erros ficam salvos apenas neste
      aparelho (últimos 50).
    </p>

    <ConfirmDialog
      :open="showClear"
      title="Limpar histórico?"
      message="Todos os erros registrados neste aparelho serão removidos."
      confirm-label="Limpar"
      danger
      @confirm="clear"
      @cancel="showClear = false"
    />
  </section>
</template>
