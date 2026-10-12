<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { RouterView, useRoute, useRouter } from 'vue-router'
import { useSyncStore } from './stores/sync.js'
import { useSessionStore } from './stores/session.js'
import { onStepUpRequired, onUnauthorized } from './api/client.js'
import { listSpaces } from './api/space-api.js'
import { useToastsStore } from './stores/toasts.js'
import { useAchievementsStore } from './stores/achievements.js'
import TopBar from './components/TopBar.vue'
import BottomNav from './components/BottomNav.vue'
import Toasts from './components/Toasts.vue'
import TopProgress from './components/TopProgress.vue'
import UpdatePrompt from './components/UpdatePrompt.vue'

const route = useRoute()
const router = useRouter()
const sync = useSyncStore()
const session = useSessionStore()
const toasts = useToastsStore()
const achievements = useAchievementsStore()

let knownAchievements = new Set<string>()
let primed = false

async function checkAchievements(): Promise<void> {
  if (!session.hasSpace) return
  try {
    await achievements.load()
  } catch {
    return
  }
  const ids = achievements.items.map((a) => a.id)
  if (!primed) {
    knownAchievements = new Set(ids)
    primed = true
    return
  }
  for (const a of achievements.items) {
    if (knownAchievements.has(a.id)) continue
    const unit = a.payload.metric === 'paginas' ? 'páginas' : 'livros'
    toasts.push(`Conquista desbloqueada! Meta de ${a.payload.target} ${unit}.`, {
      to: { name: 'achievements', query: { highlight: a.id } },
    })
  }
  knownAchievements = new Set(ids)
}

const bare = computed(() => ['login', 'two-factor', 'onboarding'].includes(String(route.name)))

let outboxTimer: ReturnType<typeof setTimeout> | null = null

function maybeSync(): void {
  if (session.hasSpace && navigator.onLine) void sync.sync()
}

/** Keep the current space id valid (it may point to a deleted space). */
async function reconcileSpace(): Promise<void> {
  if (!session.isAuthenticated || !session.hasSpace) return
  try {
    const spaces = await listSpaces()
    if (spaces.length === 0) {
      session.setSpace(null)
      return
    }
    if (!spaces.some((s) => s.id === session.spaceId)) {
      session.setSpace(spaces[0]?.id ?? null)
    }
  } catch {
    // transient error: keep the current selection
  }
}

/** Immediate sync after a local write (debounced), when there is a connection. */
function scheduleSync(): void {
  if (!session.hasSpace) return
  if (outboxTimer) clearTimeout(outboxTimer)
  outboxTimer = setTimeout(() => {
    if (navigator.onLine) void sync.sync()
  }, 400)
}

onMounted(() => {
  void sync.bootstrap()
  void reconcileSpace()
  maybeSync()
  void checkAchievements()
  window.addEventListener('online', maybeSync)
  window.addEventListener('ml:outbox', scheduleSync)
  // Safety net: periodic sync in case something was missed.
  setInterval(maybeSync, 2 * 60_000)

  onStepUpRequired(() => {
    session.applyStepUp(null)
    void router.push({ name: 'two-factor', query: { redirect: router.currentRoute.value.fullPath } })
  })
  onUnauthorized(() => {
    session.logout()
    void router.push({ name: 'login' })
  })
})

// Validate the space as soon as the user is authenticated (after login/2FA).
watch(
  () => session.isAuthenticated,
  (authed) => {
    if (authed) void reconcileSpace()
  },
)

// Sync as soon as a space becomes available (after login/onboarding).
watch(
  () => session.spaceId,
  () => {
    maybeSync()
    void checkAchievements()
  },
)

// After each sync, surface brand-new achievements as a toast.
watch(
  () => sync.lastSyncedAt,
  () => {
    void checkAchievements()
  },
)
</script>

<template>
  <div class="app-shell paper-grain min-h-full">
    <TopProgress />
    <div class="relative z-10 flex min-h-full flex-col">
      <TopBar v-if="!bare" />

      <main :class="bare ? 'flex-1' : 'mx-auto w-full max-w-2xl flex-1 px-4 pb-28 pt-6'">
        <RouterView v-slot="{ Component }">
          <Transition name="page" mode="out-in">
            <div :key="route.fullPath">
              <component :is="Component" />
            </div>
          </Transition>
        </RouterView>
      </main>

      <BottomNav v-if="!bare" />
    </div>

    <Toasts />
    <UpdatePrompt />
  </div>
</template>
