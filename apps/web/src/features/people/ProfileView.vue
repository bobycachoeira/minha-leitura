<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  follow,
  getProfile,
  getUserPosts,
  unfollow,
  type PublicPost,
  type PublicProfile,
} from '../../api/social-api.js'
import { relativeTime } from '../../lib/format.js'
import AppIcon from '../../components/AppIcon.vue'
import Avatar from '../../components/Avatar.vue'
import SkeletonBlock from '../../components/SkeletonBlock.vue'

const route = useRoute()
const router = useRouter()

const profile = ref<PublicProfile | null>(null)
const posts = ref<PublicPost[]>([])
const postsLoading = ref(true)
const busy = ref(false)

const id = computed(() => String(route.params.id))

async function load(): Promise<void> {
  profile.value = await getProfile(id.value)
  postsLoading.value = true
  try {
    posts.value = await getUserPosts(id.value)
  } finally {
    postsLoading.value = false
  }
}

async function toggleFollow(): Promise<void> {
  if (!profile.value || profile.value.isSelf) return
  busy.value = true
  try {
    if (profile.value.isFollowing) await unfollow(profile.value.id)
    else await follow(profile.value.id)
    profile.value.isFollowing = !profile.value.isFollowing
  } finally {
    busy.value = false
  }
}

onMounted(load)
watch(id, load)
</script>

<template>
  <section v-if="profile" class="space-y-5">
    <button class="btn btn-ghost btn-sm" @click="router.back()">
      <AppIcon name="back" :size="18" /> Voltar
    </button>

    <header class="card flex items-start gap-4 p-5">
      <Avatar :name="profile.name" :src="profile.avatar" :size="64" />
      <div class="min-w-0 flex-1">
        <h1 class="display-hero text-2xl">{{ profile.name }}</h1>
        <p v-if="profile.bio" class="mt-1 text-sm text-ink-soft">{{ profile.bio }}</p>
        <p class="mt-1 text-xs text-ink-mute">
          {{ profile.posts }} posts · {{ profile.followers }} seguidores · {{ profile.following }} seguindo ·
          {{ profile.likes ?? 0 }} curtidas · {{ profile.comments ?? 0 }} comentários
        </p>
      </div>
      <button
        v-if="!profile.isSelf"
        class="btn btn-sm shrink-0"
        :class="profile.isFollowing ? 'btn-secondary' : 'btn-primary'"
        :disabled="busy"
        @click="toggleFollow"
      >
        <AppIcon :name="profile.isFollowing ? 'check' : 'plus'" :size="15" />
        {{ profile.isFollowing ? 'Seguindo' : 'Seguir' }}
      </button>
    </header>

    <div v-if="postsLoading" class="space-y-4">
      <SkeletonBlock v-for="n in 2" :key="`skeleton-${n}`" class="h-24 rounded-2xl" />
    </div>

    <div v-else-if="posts.length === 0" class="card grid place-items-center gap-2 p-10 text-center">
      <AppIcon name="comment" :size="26" class="text-ink-mute" />
      <p class="text-sm text-ink-soft">Nenhuma postagem pública por aqui.</p>
    </div>

    <ul v-else class="space-y-4">
      <li v-for="post in posts" :key="post.id" class="card animate-rise p-4">
        <p class="text-[0.95rem] leading-snug text-ink">{{ post.summary }}</p>
        <p class="mt-1 text-xs text-ink-mute">{{ relativeTime(post.created ?? '') }}</p>
        <div class="mt-3 flex items-center gap-4 border-t border-line/60 pt-3 text-sm text-ink-mute">
          <span class="flex items-center gap-1.5"><AppIcon name="heart" :size="16" /> {{ post.reactionsCount ?? 0 }}</span>
          <span class="flex items-center gap-1.5"><AppIcon name="comment" :size="16" /> {{ post.commentsCount ?? 0 }}</span>
        </div>
      </li>
    </ul>
  </section>

  <div v-else class="card p-8 text-center text-sm text-ink-soft">Carregando perfil…</div>
</template>
