<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { apiFetch } from '../../api/client.js'
import { useSessionStore } from '../../stores/session.js'
import { usePush } from '../../composables/usePush.js'
import AppIcon from '../../components/AppIcon.vue'

type PrefKey =
  | 'likes'
  | 'comments'
  | 'follows'
  | 'feed'
  | 'periodCloseReminders'
  | 'goalReminders'
  | 'smartReminders'
  | 'partnerNudges'
  | 'nearGoalNudges'

interface Prefs {
  likes: boolean
  comments: boolean
  follows: boolean
  feed: boolean
  periodCloseReminders: boolean
  goalReminders: boolean
  smartReminders: boolean
  partnerNudges: boolean
  nearGoalNudges: boolean
  reminderTime: string
}

const session = useSessionStore()
const { supported, subscribe, unsubscribe, getSubscription, permission } = usePush()

const subscribed = ref(false)
const busy = ref(false)
const busyTest = ref(false)
const status = ref<string | null>(null)
const prefs = ref<Prefs>({
  likes: true,
  comments: true,
  follows: true,
  feed: true,
  periodCloseReminders: true,
  goalReminders: true,
  smartReminders: true,
  partnerNudges: true,
  nearGoalNudges: true,
  reminderTime: '',
})
const loading = ref(true)

const OPTIONS: Array<{ key: PrefKey; label: string; hint: string; icon: string }> = [
  { key: 'likes', label: 'Curtidas', hint: 'Quando alguém curte algo seu', icon: 'heart' },
  { key: 'comments', label: 'Comentários', hint: 'Quando comentam no que você publicou', icon: 'comment' },
  { key: 'follows', label: 'Novos seguidores', hint: 'Quando alguém começa a te seguir', icon: 'users' },
  { key: 'feed', label: 'Novidades de quem eu sigo', hint: 'Quando alguém que você segue publica', icon: 'sparkles' },
  { key: 'periodCloseReminders', label: 'Fechamento de período', hint: 'Quando um período das suas metas fecha', icon: 'target' },
  { key: 'goalReminders', label: 'Lembretes de meta', hint: 'Um lembrete por dia para registrar a leitura', icon: 'bell' },
  { key: 'smartReminders', label: 'Lembrete inteligente', hint: 'Só me avisa se eu ainda não registrei leitura hoje', icon: 'check' },
  { key: 'partnerNudges', label: 'Empurrão do casal', hint: 'Quando seu par lê e você ainda não leu', icon: 'users' },
  { key: 'nearGoalNudges', label: 'Perto da meta', hint: 'Quando você está perto de bater a meta', icon: 'target' },
]

async function loadPrefs(): Promise<void> {
  if (!session.spaceId) return
  loading.value = true
  try {
    const data = await apiFetch<Prefs>('/api/notification-preferences', { query: { space: session.spaceId } })
    prefs.value = { ...prefs.value, ...data }
  } finally {
    loading.value = false
  }
}

async function savePref(key: PrefKey, value: boolean): Promise<void> {
  if (!session.spaceId) return
  prefs.value = { ...prefs.value, [key]: value }
  try {
    await apiFetch('/api/notification-preferences', {
      method: 'PUT',
      query: { space: session.spaceId },
      body: { [key]: value },
    })
  } catch {
    prefs.value = { ...prefs.value, [key]: !value }
  }
}

async function saveTime(value: string): Promise<void> {
  if (!session.spaceId) return
  const previous = prefs.value.reminderTime
  prefs.value = { ...prefs.value, reminderTime: value }
  try {
    await apiFetch('/api/notification-preferences', {
      method: 'PUT',
      query: { space: session.spaceId },
      body: { reminderTime: value },
    })
  } catch {
    prefs.value = { ...prefs.value, reminderTime: previous }
  }
}

async function refresh(): Promise<void> {
  const existing = await getSubscription()
  subscribed.value = Boolean(existing) && Notification.permission === 'granted'
  if (subscribed.value && existing && session.spaceId) {
    try {
      await apiFetch('/api/notification-preferences', {
        method: 'PUT',
        query: { space: session.spaceId },
        body: { subscription: existing.toJSON() },
      })
    } catch {
      // best-effort sync
    }
  }
}

async function enablePush(): Promise<void> {
  busy.value = true
  status.value = null
  try {
    const subscription = await subscribe()
    if (!subscription) {
      status.value =
        permission() === 'denied'
          ? 'Notificações bloqueadas no navegador. Habilite nas permissões do site.'
          : 'Não foi possível ativar as notificações.'
      return
    }
    if (session.spaceId) {
      await apiFetch('/api/notification-preferences', {
        method: 'PUT',
        query: { space: session.spaceId },
        body: { subscription: subscription.toJSON() },
      })
    }
    subscribed.value = true
    status.value = 'Notificações ativadas.'
  } catch (error) {
    status.value = `Falha ao ativar: ${error instanceof Error ? error.message : 'erro desconhecido'}`
  } finally {
    busy.value = false
  }
}

async function disablePush(): Promise<void> {
  busy.value = true
  status.value = null
  try {
    await unsubscribe()
    subscribed.value = false
    status.value = 'Notificações desativadas.'
  } finally {
    busy.value = false
  }
}

/** Asks the backend to queue a test push (delivered by the notifier). */
async function sendTest(): Promise<void> {
  if (!session.spaceId) return
  busyTest.value = true
  status.value = null
  try {
    await apiFetch('/api/notifications/test', { method: 'POST', query: { space: session.spaceId } })
    status.value = 'Teste a caminho — deve chegar em instantes.'
  } catch {
    status.value = 'Não foi possível enviar o teste.'
  } finally {
    busyTest.value = false
  }
}

onMounted(async () => {
  await Promise.all([loadPrefs(), refresh()])
})
</script>

<template>
  <section v-if="supported" class="space-y-4">
    <div class="card flex items-center justify-between gap-4 p-4">
      <div>
        <p class="eyebrow flex items-center gap-1.5">
          <AppIcon name="bell" :size="14" /> Notificações
          <span v-if="subscribed" class="chip !py-0 text-[0.6rem] !text-sage !border-sage/40">Ativado</span>
        </p>
        <p class="mt-1 text-sm text-ink-soft">Avisos de atividade no celular.</p>
        <p v-if="status" class="mt-1 text-xs text-ink-mute" role="status">{{ status }}</p>
      </div>
      <button
        v-if="!subscribed"
        v-busy="busy"
        class="btn btn-secondary btn-sm shrink-0"
        :disabled="busy"
        @click="enablePush"
      >
        Ativar
      </button>
      <div v-else class="flex shrink-0 items-center gap-2">
        <button
          v-busy="busyTest"
          class="btn btn-secondary btn-sm"
          :disabled="busyTest"
          @click="sendTest"
        >
          Enviar teste
        </button>
        <button
          v-busy="busy"
          class="btn btn-ghost btn-sm text-ink-mute"
          :disabled="busy"
          @click="disablePush"
        >
          Desativar
        </button>
      </div>
    </div>

    <div class="card divide-y divide-line/60">
      <p class="eyebrow px-4 pb-2 pt-4">O que me avisar</p>
      <label
        v-for="option in OPTIONS"
        :key="option.key"
        class="flex cursor-pointer items-center gap-3 px-4 py-3"
      >
        <AppIcon :name="option.icon" :size="18" class="text-ink-mute" />
        <span class="min-w-0 flex-1">
          <span class="block text-sm font-medium text-ink">{{ option.label }}</span>
          <span class="block text-xs text-ink-mute">{{ option.hint }}</span>
        </span>
        <input
          type="checkbox"
          class="toggle"
          :checked="prefs[option.key]"
          :disabled="loading"
          @change="savePref(option.key, ($event.target as HTMLInputElement).checked)"
        />
      </label>

      <div class="flex items-center gap-3 px-4 py-3">
        <AppIcon name="bell" :size="18" class="text-ink-mute" />
        <span class="min-w-0 flex-1">
          <span class="block text-sm font-medium text-ink">Horário do lembrete</span>
          <span class="block text-xs text-ink-mute">A que horas avisar (vazio = 23:00)</span>
        </span>
        <input
          type="time"
          class="input !w-auto !py-1 text-sm"
          :value="prefs.reminderTime"
          :disabled="loading"
          @change="saveTime(($event.target as HTMLInputElement).value)"
        />
      </div>
    </div>
  </section>
</template>
