<script setup lang="ts">
import { nextTick, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { createPost } from '../../api/feed-api.js'
import { useSessionStore } from '../../stores/session.js'
import { useAchievementsStore, type AchievementRecord } from '../../stores/achievements.js'
import { useAchievementCard } from './useAchievementCard.js'
import { shareImage, downloadImage } from '../../lib/share.js'
import { useCardTheme } from '../../composables/useCardTheme.js'
import type { AchievementPayloadInput } from '@ml/shared'
import AppIcon from '../../components/AppIcon.vue'
import PublishPrompt from '../../components/PublishPrompt.vue'
import AchievementCard from '../../components/AchievementCard.vue'

const session = useSessionStore()
const achievements = useAchievementsStore()
const { render, toBlob } = useAchievementCard()
const { themeId, themes, setTheme } = useCardTheme()
const route = useRoute()
const highlightId = ref<string | null>(null)

const promptOpen = ref(false)
const promptText = ref('')
const pendingPublish = ref<AchievementRecord | null>(null)
const busy = ref<string | null>(null)

function unit(metric: string): string {
  return metric === 'paginas' ? 'páginas' : 'livros'
}
function periodLabel(period?: string): string {
  return period === 'mes' ? 'no mês' : period === 'semana' ? 'na semana' : period === 'dia' ? 'no dia' : ''
}
function payout(a: AchievementRecord): string {
  const label = unit(a.payload.metric)
  if (a.kind === 'meta_batida') {
    return `Bati minha meta de ${a.payload.target} ${label} ${periodLabel(a.payload.period)}! 📚`
  }
  const remaining = Math.max(0, a.payload.target - a.payload.progress)
  return `Por pouco! Faltaram ${remaining} ${label} para minha meta.`
}

function toInput(a: AchievementRecord): AchievementPayloadInput {
  return {
    kind: a.kind,
    metric: a.payload.metric,
    target: a.payload.target,
    progress: a.payload.progress,
    startDate: a.payload.startDate,
    endDate: a.payload.endDate,
    streak: a.payload.streak ?? 0,
    books: a.payload.books ?? [],
  }
}

function openPublish(a: AchievementRecord): void {
  pendingPublish.value = a
  promptText.value = payout(a)
  promptOpen.value = true
}

async function publishPost(visibility: 'space' | 'public', text: string): Promise<void> {
  promptOpen.value = false
  const a = pendingPublish.value
  try {
    if (session.spaceId) {
      await createPost(session.spaceId, 'meta_batida', text, undefined, visibility, a?.id)
    }
  } catch {
    // best-effort
  }
  if (a) achievements.acknowledge(a.id)
  pendingPublish.value = null
}

async function share(a: AchievementRecord, format: 'square' | 'story'): Promise<void> {
  busy.value = a.id
  try {
    const dataUrl = render(toInput(a), format)
    if (!dataUrl) return
    const blob = await toBlob(dataUrl)
    const ok = await shareImage(blob, format === 'story' ? 'conquista-story.png' : 'conquista.png', payout(a))
    if (!ok) downloadImage(blob, format === 'story' ? 'conquista-story.png' : 'conquista.png')
    achievements.acknowledge(a.id)
  } finally {
    busy.value = null
  }
}

function download(a: AchievementRecord): void {
  const dataUrl = render(toInput(a), 'square')
  if (!dataUrl) return
  void toBlob(dataUrl).then((blob) => downloadImage(blob, 'conquista.png'))
}

onMounted(async () => {
  await achievements.load()
  const highlight = route.query.highlight
  if (typeof highlight === 'string') {
    highlightId.value = highlight
    await nextTick()
    document.getElementById(`achv-${highlight}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    setTimeout(() => {
      highlightId.value = null
    }, 3000)
  }
})
</script>

<template>
  <section class="space-y-5">
    <header class="flex items-end justify-between gap-3">
      <div>
        <p class="eyebrow flex items-center gap-1.5"><AppIcon name="award" :size="14" /> Conquistas</p>
        <h1 class="display-hero mt-1 text-3xl">Troféus</h1>
        <p class="mt-1 text-sm text-ink-soft">Compartilhe no mural, no WhatsApp/Instagram — você decide.</p>
        <div class="mt-3 flex items-center gap-2">
          <span class="eyebrow !text-[0.55rem]">Tema do card</span>
          <button
            v-for="t in themes"
            :key="t.id"
            class="h-6 w-6 rounded-full border-2 transition"
            :class="themeId === t.id ? 'border-ink scale-110' : 'border-transparent'"
            :style="{ backgroundColor: t.swatch }"
            :title="t.label"
            :aria-label="t.label"
            @click="setTheme(t.id)"
          />
        </div>
      </div>
      <button v-if="achievements.hasNew" class="btn btn-secondary btn-sm shrink-0" @click="achievements.acknowledgeAll()">
        <AppIcon name="check" :size="15" /> Marcar como visto
      </button>
    </header>

    <div v-if="achievements.items.length === 0" class="card grid place-items-center gap-2 p-10 text-center">
      <AppIcon name="award" :size="28" class="text-ink-mute" />
      <p class="text-sm text-ink-soft">Ao bater uma meta, sua conquista aparece aqui.</p>
    </div>

    <ul class="grid gap-5 sm:grid-cols-2">
      <li
        v-for="a in achievements.items"
        :id="`achv-${a.id}`"
        :key="a.id"
        class="animate-rise rounded-2xl transition"
        :class="highlightId === a.id ? 'ring-4 ring-oxblood/50' : ''"
      >
        <AchievementCard :kind="a.kind" :payload="a.payload">
          <div class="grid gap-2 pt-1">
            <button class="btn btn-primary btn-sm" @click="openPublish(a)">
              <AppIcon name="sparkles" :size="15" /> Publicar no mural
            </button>
            <div class="flex gap-2">
              <button v-busy="busy === a.id" class="btn btn-ink btn-sm flex-1" :disabled="busy === a.id" @click="share(a, 'square')">
                <AppIcon name="sparkles" :size="15" /> Compartilhar
              </button>
              <button class="btn btn-secondary btn-sm flex-1" :disabled="busy === a.id" @click="share(a, 'story')">
                Story 9:16
              </button>
            </div>
            <button class="text-xs text-ink-mute underline" @click="download(a)">Baixar imagem</button>
          </div>
        </AchievementCard>
      </li>
    </ul>

    <PublishPrompt
      :open="promptOpen"
      title="Compartilhar conquista"
      :default-text="promptText"
      @close="promptOpen = false"
      @publish="publishPost"
    />
  </section>
</template>
