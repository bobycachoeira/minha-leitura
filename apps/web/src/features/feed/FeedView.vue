<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { useFeedStore } from '../../stores/feed.js'
import { useGoalsStore } from '../../stores/goals.js'
import { useAchievementsStore } from '../../stores/achievements.js'
import { useSyncStore } from '../../stores/sync.js'
import { useSessionStore } from '../../stores/session.js'
import { listMembers, type SpaceMemberItem } from '../../api/space-api.js'
import { createPost, type CommentItem } from '../../api/feed-api.js'
import { relativeTime } from '../../lib/format.js'
import { daysLabel, formatDayMonth, remainingLabel } from '../../lib/format.js'
import PartnerProgress from './PartnerProgress.vue'
import AppIcon from '../../components/AppIcon.vue'
import Avatar from '../../components/Avatar.vue'
import AchievementCard from '../../components/AchievementCard.vue'

const feed = useFeedStore()
const goals = useGoalsStore()
const achievements = useAchievementsStore()
const sync = useSyncStore()
const session = useSessionStore()
const members = ref<SpaceMemberItem[]>([])
const draft = ref<Record<string, string>>({})
const composeText = ref('')
const visibility = ref<'space' | 'public'>('space')
const posting = ref(false)
const openComments = ref<Record<string, boolean>>({})
const replyTo = ref<Record<string, string>>({})
const replyDraft = ref<Record<string, string>>({})

const myId = computed(() => session.user?.id ?? '')
const myAvatar = computed(() => session.user?.avatar ?? '')
const who = computed(() => session.user?.name?.split(' ')[0] ?? 'Leitor(a)')
const greeting = computed(() => {
  const h = new Date().getHours()
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
})

function roots(postId: string): CommentItem[] {
  return (feed.comments[postId] ?? []).filter((c) => !c.parent)
}
function repliesFor(postId: string, parentId: string): CommentItem[] {
  return (feed.comments[postId] ?? []).filter((c) => c.parent === parentId)
}

async function submitPost(): Promise<void> {
  const text = composeText.value.trim()
  if (!session.spaceId || !text) return
  posting.value = true
  try {
    await createPost(session.spaceId, 'manual', text, undefined, visibility.value)
    composeText.value = ''
    visibility.value = 'space'
    await feed.load()
  } finally {
    posting.value = false
  }
}

async function toggleComments(postId: string): Promise<void> {
  openComments.value[postId] = !openComments.value[postId]
  if (openComments.value[postId]) await feed.loadComments(postId)
}

async function submitComment(postId: string): Promise<void> {
  const text = draft.value[postId]?.trim()
  if (!text) return
  await feed.comment(postId, text)
  draft.value[postId] = ''
}

function startReply(postId: string, parentId: string): void {
  replyTo.value[postId] = replyTo.value[postId] === parentId ? '' : parentId
}

async function submitReply(postId: string, parentId: string): Promise<void> {
  const text = replyDraft.value[parentId]?.trim()
  if (!text) return
  await feed.comment(postId, text, parentId)
  replyDraft.value[parentId] = ''
  replyTo.value[postId] = ''
}

function kindGlyph(kind: string): string {
  if (kind === 'meta_batida') return 'award'
  if (kind === 'livro_concluido') return 'check'
  if (kind === 'desafio') return 'users'
  return 'sparkles'
}

function notifText(post: { notifKind?: string; body?: string }): string {
  if (post.notifKind === 'comment') return `comentou: "${post.body ?? ''}"`
  if (post.notifKind === 'follow') return 'começou a seguir você'
  return 'curtiu sua publicação'
}

function goalLabel(period: string): string {
  return period === 'mes' ? 'no mês' : period === 'semana' ? 'na semana' : 'no dia'
}
function goalPct(progress = 0, target = 1): number {
  return Math.min(100, Math.round((progress / Math.max(1, target)) * 100))
}

onMounted(async () => {
  await feed.load()
  await goals.load()
  await achievements.load()
  if (session.spaceId) members.value = await listMembers(session.spaceId)
})

// Refresh the mural right after a sync (e.g., a new achievement from another device).
watch(
  () => sync.lastSyncedAt,
  async () => {
    await feed.load()
    await goals.load()
    await achievements.load()
  },
)
</script>

<template>
  <section class="space-y-5">
    <header>
      <p class="eyebrow">{{ greeting }}, {{ who }}</p>
      <h1 class="display-hero mt-1 text-3xl">Meu mural</h1>
      <p class="mt-1 text-sm text-ink-soft">Suas leituras e as de quem você segue, num só lugar.</p>
    </header>

    <PartnerProgress :members="members" />

    <div class="flex gap-3 overflow-x-auto pb-1">
      <RouterLink
        to="/achievements"
        class="card-flat relative min-w-[9.5rem] p-3"
        :class="achievements.hasNew ? 'border-oxblood/60' : ''"
      >
        <span
          v-if="achievements.hasNew"
          class="absolute right-2 top-2 rounded-full bg-oxblood px-1.5 py-0.5 text-[0.55rem] font-bold text-white"
        >
          NOVA
        </span>
        <AppIcon name="award" :size="20" :class="achievements.hasNew ? 'text-oxblood' : 'text-ink-mute'" />
        <p class="mt-1 text-sm font-semibold text-ink">Conquistas</p>
        <p class="text-[0.7rem] text-ink-mute">
          {{ achievements.newCount > 0 ? `${achievements.newCount} nova(s)` : 'ver troféus' }}
        </p>
      </RouterLink>

      <RouterLink
        v-for="row in goals.activeGoals"
        :key="row.goal.id"
        to="/goals"
        class="card-flat min-w-[10.5rem] p-3"
      >
        <p class="eyebrow !text-[0.55rem]">
          {{ row.goal.metric === 'paginas' ? 'Páginas' : 'Livros' }} {{ goalLabel(row.goal.period) }}
        </p>
        <p class="stat-num mt-1 text-2xl" :class="row.period?.status === 'batida' ? 'text-sage' : 'text-oxblood'">
          {{ row.period?.progress ?? 0 }}<span class="text-sm text-ink-mute">/{{ row.goal.target }}</span>
        </p>
        <div class="mt-2 h-1.5 overflow-hidden rounded-full bg-paper-sunken">
          <div
            class="h-full rounded-full transition-all duration-700"
            :class="row.period?.status === 'batida' ? 'bg-sage' : 'bg-oxblood'"
            :style="{ width: `${goalPct(row.period?.progress, row.goal.target)}%` }"
          />
        </div>
        <p class="mt-1 text-[0.62rem] text-ink-mute">
          {{ remainingLabel(row.goal.metric, row.period?.remaining ?? row.goal.target) }} ·
          {{ daysLabel(row.period?.daysRemaining ?? 0) }}
          <template v-if="row.period?.endDate"> · fecha em {{ formatDayMonth(row.period.endDate) }}</template>
        </p>
      </RouterLink>
    </div>

    <form class="card p-3" @submit.prevent="submitPost">
      <div class="flex items-start gap-3">
        <Avatar :name="session.user?.name" :src="myAvatar" :size="36" />
        <textarea
          v-model="composeText"
          placeholder="Compartilhe uma leitura, uma meta, uma conquista…"
          class="textarea min-h-[2.6rem] flex-1 resize-none border-0 bg-transparent !px-0 focus:!shadow-none"
          rows="2"
        />
      </div>
      <div class="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div class="flex items-center gap-1.5">
          <button
            type="button"
            class="chip !py-0.5 text-[0.68rem]"
            :class="{ 'chip-active': visibility === 'space' }"
            @click="visibility = 'space'"
          >
            <AppIcon name="space" :size="12" /> Meu espaço
          </button>
          <button
            type="button"
            class="chip !py-0.5 text-[0.68rem]"
            :class="{ 'chip-active': visibility === 'public' }"
            @click="visibility = 'public'"
          >
            <AppIcon name="users" :size="12" /> Público
          </button>
        </div>
        <button type="submit" class="btn btn-primary btn-sm" :disabled="posting || !composeText.trim()">
          <AppIcon name="sparkles" :size="15" /> Publicar
        </button>
      </div>
    </form>

    <div v-if="feed.posts.length === 0" class="card grid place-items-center gap-2 p-10 text-center">
      <AppIcon name="comment" :size="26" class="text-ink-mute" />
      <p class="text-sm text-ink-soft">Ainda sem novidades. Publique a primeira leitura!</p>
    </div>

    <ul class="space-y-4">
      <li v-for="post in feed.posts" :key="post.id" class="card animate-rise p-4">
        <template v-if="post.type === 'notification'">
          <div class="flex items-center gap-3">
            <RouterLink :to="`/u/${post.authorId ?? ''}`">
              <Avatar :name="post.authorName" :src="post.authorAvatar" :size="36" />
            </RouterLink>
            <div class="min-w-0 flex-1">
              <p class="text-sm text-ink">
                <RouterLink :to="`/u/${post.authorId ?? ''}`" class="font-semibold hover:text-oxblood">{{ post.authorName }}</RouterLink>
                {{ notifText(post) }}
              </p>
              <p class="text-xs text-ink-mute">{{ relativeTime(post.created ?? '') }}</p>
            </div>
            <AppIcon
              :name="post.notifKind === 'comment' ? 'comment' : post.notifKind === 'follow' ? 'users' : 'heart'"
              :size="18"
              class="text-oxblood"
            />
          </div>
        </template>
        <template v-else>
        <div class="flex items-start gap-3">
          <RouterLink v-if="post.authorId && post.authorId !== myId" :to="`/u/${post.authorId}`">
            <Avatar :name="post.authorName" :src="post.authorAvatar" :size="36" />
          </RouterLink>
          <span v-else><Avatar :name="post.authorName || session.user?.name" :src="post.authorAvatar || myAvatar" :size="36" /></span>
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2">
              <RouterLink
                v-if="post.authorId && post.authorId !== myId"
                :to="`/u/${post.authorId}`"
                class="text-xs font-semibold text-ink hover:text-oxblood"
              >
                {{ post.authorName }}
              </RouterLink>
              <span v-else class="text-xs font-semibold text-ink">{{ post.authorName || 'Você' }}</span>
              <span v-if="post.visibility === 'public'" class="chip !py-0 !text-[0.6rem]">
                <AppIcon name="users" :size="11" /> público
              </span>
              <span class="ml-auto flex items-center gap-1 text-[0.68rem] text-ink-mute">
                <AppIcon :name="kindGlyph(post.kind)" :size="13" /> {{ relativeTime(post.created ?? '') }}
              </span>
            </div>
            <p class="mt-1 whitespace-pre-wrap text-[0.95rem] leading-snug text-ink">{{ post.summary }}</p>
            <AchievementCard
              v-if="post.achievement"
              class="mt-3"
              :kind="post.achievement.kind"
              :payload="post.achievement.payload"
            />
          </div>
        </div>

        <div class="mt-3 flex items-center gap-4 border-t border-line/60 pt-3 text-sm">
          <button
            class="flex items-center gap-1.5 transition"
            :class="post.liked ? 'text-oxblood' : 'text-ink-soft hover:text-oxblood'"
            @click="feed.toggleReaction(post.id)"
          >
            <AppIcon name="heart" :size="17" :fill="post.liked" /> {{ post.reactionsCount ?? 0 }}
          </button>
          <button class="flex items-center gap-1.5 text-ink-soft transition hover:text-oxblood" @click="toggleComments(post.id)">
            <AppIcon name="comment" :size="17" /> {{ post.commentsCount ?? 0 }}
          </button>
        </div>

        <div v-if="openComments[post.id]" class="mt-3 space-y-3">
          <ul v-if="roots(post.id).length" class="space-y-3">
            <li v-for="c in roots(post.id)" :key="c.id" class="space-y-2">
              <div class="flex items-start gap-2">
                <Avatar :name="c.authorName" :src="c.authorAvatar" :size="26" />
                <div class="min-w-0 flex-1 rounded-xl bg-paper-sunken px-3 py-2">
                  <p class="text-xs font-semibold text-ink">{{ c.authorName || 'Leitor' }}</p>
                  <p class="text-sm text-ink-soft">{{ c.body }}</p>
                  <div class="mt-1 flex items-center gap-3">
                    <button
                      class="flex items-center gap-1 text-[0.7rem] font-semibold"
                      :class="c.liked ? 'text-oxblood' : 'text-ink-mute'"
                      @click="feed.likeComment(post.id, c.id)"
                    >
                      <AppIcon name="heart" :size="13" :fill="c.liked" /> {{ c.likesCount ?? 0 }}
                    </button>
                    <button class="text-[0.7rem] font-semibold text-oxblood" @click="startReply(post.id, c.id)">
                      Responder
                    </button>
                  </div>
                </div>
              </div>

              <ul v-if="repliesFor(post.id, c.id).length" class="ml-8 space-y-2">
                <li v-for="r in repliesFor(post.id, c.id)" :key="r.id" class="flex items-start gap-2">
                  <Avatar :name="r.authorName" :src="r.authorAvatar" :size="22" />
                  <div class="min-w-0 flex-1 rounded-xl bg-paper-sunken px-3 py-2">
                    <p class="text-xs font-semibold text-ink">{{ r.authorName || 'Leitor' }}</p>
                    <p class="text-sm text-ink-soft">{{ r.body }}</p>
                    <button
                      class="mt-1 flex items-center gap-1 text-[0.7rem] font-semibold"
                      :class="r.liked ? 'text-oxblood' : 'text-ink-mute'"
                      @click="feed.likeComment(post.id, r.id)"
                    >
                      <AppIcon name="heart" :size="12" :fill="r.liked" /> {{ r.likesCount ?? 0 }}
                    </button>
                  </div>
                </li>
              </ul>

              <form v-if="replyTo[post.id] === c.id" class="ml-8 flex gap-2" @submit.prevent="submitReply(post.id, c.id)">
                <input v-model="replyDraft[c.id]" placeholder="Responder…" class="input flex-1 !py-2 text-sm" autofocus />
                <button type="submit" class="btn btn-ink btn-sm">Enviar</button>
              </form>
            </li>
          </ul>
          <form class="flex gap-2" @submit.prevent="submitComment(post.id)">
            <input v-model="draft[post.id]" placeholder="Escreva um comentário…" class="input flex-1 !py-2 text-sm" />
            <button type="submit" class="btn btn-ink btn-sm">Enviar</button>
          </form>
        </div>
        </template>
      </li>
    </ul>
  </section>
</template>
