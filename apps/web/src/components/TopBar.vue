<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useSyncStore } from '../stores/sync.js'
import { useSessionStore } from '../stores/session.js'
import { getNotifications } from '../api/social-api.js'
import { useTheme } from '../composables/useTheme.js'
import { applyUpdate, needRefresh } from '../lib/pwa-update.js'
import AppIcon from './AppIcon.vue'
import Avatar from './Avatar.vue'
import SyncStatus from './SyncStatus.vue'

const router = useRouter()
const session = useSessionStore()
const sync = useSyncStore()
const { theme, toggle, accent, setAccent, accents } = useTheme()

const menuOpen = ref(false)
const unread = ref(0)
const menuRef = ref<HTMLElement | null>(null)
const buttonRef = ref<HTMLElement | null>(null)

function onDocPointerDown(event: PointerEvent): void {
  if (!menuOpen.value) return
  const target = event.target as Node
  if (menuRef.value?.contains(target) || buttonRef.value?.contains(target)) return
  menuOpen.value = false
}

const pending = computed(() => sync.pendingCount)

async function refreshUnread(): Promise<void> {
  if (!session.hasSpace) return
  try {
    unread.value = (await getNotifications()).unread
  } catch {
    unread.value = 0
  }
}

onMounted(() => {
  void refreshUnread()
  setInterval(refreshUnread, 45_000)
  document.addEventListener('pointerdown', onDocPointerDown)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onDocPointerDown)
})

function close(): void {
  menuOpen.value = false
}

async function doUpdate(): Promise<void> {
  close()
  await applyUpdate()
}

function signOut(): void {
  close()
  session.logout()
  void router.push({ name: 'login' })
}

async function resetLocal(): Promise<void> {
  close()
  const ok = window.confirm(
    'Apagar TODOS os dados locais deste aparelho (leituras, acervo local e pendências) e baixar novamente do servidor? Use isto para recomeçar do zero.',
  )
  if (!ok) return
  await sync.hardReset()
  window.location.reload()
}
</script>

<template>
  <header class="sticky top-0 z-30 border-b border-line/70 bg-paper/85 backdrop-blur-md">
    <div class="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 py-3">
      <RouterLink to="/" class="flex items-center gap-2.5" @click="close">
        <span class="grid h-9 w-9 place-items-center rounded-xl bg-oxblood text-white shadow-book">
          <AppIcon name="books" :size="20" />
        </span>
        <span class="leading-tight">
          <span class="brand-mark block text-[1.05rem] font-semibold text-ink">Minha Leitura</span>
          <span class="eyebrow block text-[0.6rem]">minha estante de leitura</span>
        </span>
      </RouterLink>

      <div class="flex items-center gap-1.5">
        <SyncStatus />

        <RouterLink
          to="/notifications"
          class="relative btn btn-ghost !px-2"
          aria-label="Notificações"
          @click="close"
        >
          <AppIcon name="bell" :size="19" />
          <span
            v-if="unread > 0"
            class="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-oxblood px-1 text-[0.6rem] text-white"
          >
            {{ unread }}
          </span>
        </RouterLink>

        <button class="btn btn-ghost !px-2" :aria-label="theme === 'dark' ? 'Tema claro' : 'Tema escuro'" @click="toggle">
          <AppIcon :name="theme === 'dark' ? 'sun' : 'moon'" :size="19" />
        </button>

        <button
          ref="buttonRef"
          class="relative grid h-9 w-9 place-items-center rounded-full"
          aria-label="Abrir menu"
          @click="menuOpen = !menuOpen"
        >
          <Avatar :name="session.user?.name" :src="session.user?.avatar" :size="36" />
          <span
            v-if="pending > 0"
            class="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-oxblood px-1 text-[0.6rem] text-white"
          >
            {{ pending }}
          </span>
          <span
            v-if="needRefresh"
            class="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-paper bg-saffron"
            aria-hidden="true"
          />
        </button>
      </div>
    </div>

    <Transition name="page">
      <div v-if="menuOpen" ref="menuRef" class="mx-auto max-w-2xl px-4">
        <div class="mb-3 overflow-hidden rounded-2xl border border-line bg-paper-raised shadow-lift">
          <RouterLink to="/me" class="flex items-center gap-3 border-b border-line/70 px-4 py-3 hover:bg-paper-sunken" @click="close">
            <Avatar :name="session.user?.name" :src="session.user?.avatar" :size="32" />
            <span class="min-w-0 flex-1">
              <span class="block truncate text-sm font-medium text-ink">{{ session.user?.name ?? 'Meu perfil' }}</span>
              <span class="block truncate text-xs text-ink-mute">{{ session.user?.email }}</span>
            </span>
            <AppIcon name="edit" :size="16" class="text-ink-mute" />
          </RouterLink>
          <RouterLink to="/challenges" class="flex items-center gap-3 px-4 py-3 text-sm hover:bg-paper-sunken" @click="close">
            <AppIcon name="users" :size="18" /> Desafios do casal
          </RouterLink>
          <RouterLink to="/people" class="flex items-center gap-3 px-4 py-3 text-sm hover:bg-paper-sunken" @click="close">
            <AppIcon name="users" :size="18" /> Pessoas que sigo
          </RouterLink>
          <RouterLink to="/achievements" class="flex items-center gap-3 px-4 py-3 text-sm hover:bg-paper-sunken" @click="close">
            <AppIcon name="award" :size="18" /> Conquistas
          </RouterLink>
          <RouterLink to="/space" class="flex items-center gap-3 px-4 py-3 text-sm hover:bg-paper-sunken" @click="close">
            <AppIcon name="space" :size="18" /> Espaço e convites
          </RouterLink>
          <RouterLink to="/security" class="flex items-center gap-3 px-4 py-3 text-sm hover:bg-paper-sunken" @click="close">
            <AppIcon name="target" :size="18" /> Segurança (2FA)
          </RouterLink>
          <RouterLink to="/diagnostics" class="flex items-center gap-3 px-4 py-3 text-sm hover:bg-paper-sunken" @click="close">
            <AppIcon name="bell" :size="18" /> Diagnóstico
          </RouterLink>
          <div class="border-t border-line/70 px-4 py-3">
            <p class="eyebrow mb-2">Paleta</p>
            <div class="flex items-center gap-2">
              <button
                v-for="option in accents"
                :key="option.id"
                class="h-7 w-7 rounded-full border-2 transition"
                :class="accent === option.id ? 'border-ink scale-110' : 'border-transparent'"
                :style="{ backgroundColor: option.swatch }"
                :aria-label="option.label"
                :title="option.label"
                @click="setAccent(option.id)"
              />
              <button class="ml-auto btn btn-ghost btn-sm" @click="toggle">
                <AppIcon :name="theme === 'dark' ? 'sun' : 'moon'" :size="16" />
                {{ theme === 'dark' ? 'Claro' : 'Noturno' }}
              </button>
            </div>
          </div>
          <button
            v-if="needRefresh"
            class="flex w-full items-center gap-3 border-t border-line/70 px-4 py-3 text-left text-sm text-oxblood hover:bg-paper-sunken"
            @click="doUpdate"
          >
            <AppIcon name="sync" :size="18" /> Atualizar app
          </button>
          <button class="flex w-full items-center gap-3 border-t border-line/70 px-4 py-3 text-left text-sm text-ink-soft hover:bg-paper-sunken" @click="signOut">
            <AppIcon name="logout" :size="18" /> Sair
          </button>
          <button class="flex w-full items-center gap-3 border-t border-line/70 px-4 py-3 text-left text-sm text-oxblood hover:bg-paper-sunken" @click="resetLocal">
            <AppIcon name="close" :size="18" /> Limpar dados locais (recomeçar)
          </button>
        </div>
      </div>
    </Transition>
  </header>
</template>
