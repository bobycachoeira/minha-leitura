<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { getNotifications, markNotificationsRead, type AppNotification } from '../../api/social-api.js'
import { relativeTime } from '../../lib/format.js'
import AppIcon from '../../components/AppIcon.vue'
import Avatar from '../../components/Avatar.vue'

const items = ref<AppNotification[]>([])
const loading = ref(true)

const texts = computed(() =>
  items.value.map((n) => {
    if (n.kind === 'comment') return { ...n, text: `comentou: "${n.body ?? ''}"` }
    if (n.kind === 'follow') return { ...n, text: 'começou a seguir você' }
    if (n.kind === 'post') return { ...n, text: 'publicou algo novo' }
    if (n.kind === 'period') return { ...n, text: n.body || 'Período de meta encerrado' }
    return { ...n, text: 'curtiu sua publicação' }
  }),
)

onMounted(async () => {
  const result = await getNotifications()
  items.value = result.items
  loading.value = false
  if (result.unread > 0) await markNotificationsRead()
})
</script>

<template>
  <section class="space-y-5">
    <header>
      <p class="eyebrow flex items-center gap-1.5"><AppIcon name="bell" :size="14" /> Atividade</p>
      <h1 class="display-hero mt-1 text-3xl">Notificações</h1>
    </header>

    <p v-if="loading" class="text-sm text-ink-mute">Carregando…</p>
    <div v-else-if="items.length === 0" class="card grid place-items-center gap-2 p-10 text-center">
      <AppIcon name="bell" :size="26" class="text-ink-mute" />
      <p class="text-sm text-ink-soft">Nada por aqui ainda.</p>
    </div>

    <ul v-else class="divide-y divide-line/60 overflow-hidden rounded-2xl border border-line">
      <li v-for="n in texts" :key="n.id" class="flex items-center gap-3 px-4 py-3" :class="n.is_read ? '' : 'bg-oxblood/5'">
        <RouterLink :to="`/u/${n.actor ?? ''}`">
          <Avatar :name="n.actorName" :src="n.actorAvatar" :size="36" />
        </RouterLink>
        <div class="min-w-0 flex-1">
          <p class="text-sm text-ink">
            <template v-if="n.kind === 'period'">{{ n.text }}</template>
            <template v-else><strong>{{ n.actorName }}</strong> {{ n.text }}</template>
          </p>
          <p class="text-xs text-ink-mute">{{ relativeTime(n.created ?? '') }}</p>
        </div>
        <AppIcon
          :name="n.kind === 'comment' ? 'comment' : n.kind === 'follow' ? 'users' : n.kind === 'post' ? 'sparkles' : n.kind === 'period' ? 'target' : 'heart'"
          :size="18"
          class="text-oxblood"
        />
      </li>
    </ul>
  </section>
</template>
