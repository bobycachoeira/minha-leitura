<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { findPerson, follow, listFollowing, unfollow, type Following, type PersonResult } from '../../api/social-api.js'
import AppIcon from '../../components/AppIcon.vue'
import Avatar from '../../components/Avatar.vue'
import ConfirmDialog from '../../components/ConfirmDialog.vue'
import SkeletonBlock from '../../components/SkeletonBlock.vue'

const email = ref('')
const result = ref<PersonResult | null>(null)
const following = ref<Following[]>([])
const followingLoading = ref(true)
const busy = ref(false)
const message = ref<string | null>(null)
const pendingUnfollow = ref<{ id?: string; name?: string } | null>(null)

async function loadFollowing(): Promise<void> {
  try {
    following.value = await listFollowing()
  } finally {
    followingLoading.value = false
  }
}

async function search(): Promise<void> {
  const value = email.value.trim()
  if (!value) return
  busy.value = true
  message.value = null
  result.value = null
  try {
    const found = await findPerson(value)
    if (!found.found) {
      message.value = found.self ? 'Esse é você.' : 'Nenhuma pessoa com esse e-mail.'
      return
    }
    result.value = found
  } finally {
    busy.value = false
  }
}

async function toggle(target: { id?: string; isFollowing?: boolean }): Promise<void> {
  if (!target.id) return
  if (target.isFollowing) {
    pendingUnfollow.value = target
    return
  }
  busy.value = true
  try {
    await follow(target.id)
    if (result.value && result.value.id === target.id) result.value.isFollowing = true
    await loadFollowing()
  } finally {
    busy.value = false
  }
}

async function confirmUnfollow(): Promise<void> {
  const target = pendingUnfollow.value
  if (!target?.id) return
  busy.value = true
  try {
    await unfollow(target.id)
    if (result.value && result.value.id === target.id) result.value.isFollowing = false
    await loadFollowing()
  } finally {
    busy.value = false
    pendingUnfollow.value = null
  }
}

onMounted(loadFollowing)
</script>

<template>
  <section class="space-y-5">
    <header>
      <p class="eyebrow flex items-center gap-1.5"><AppIcon name="users" :size="14" /> Conexões</p>
      <h1 class="display-hero mt-1 text-3xl">Pessoas</h1>
      <p class="mt-2 max-w-md text-sm text-ink-soft">
        Encontre alguém pelo e-mail e siga para ver as <strong>postagens públicas</strong> dela no seu mural.
      </p>
    </header>

    <form class="card flex flex-col gap-2 p-4 sm:flex-row sm:items-end" @submit.prevent="search">
      <label class="block flex-1">
        <span class="label">E-mail da pessoa</span>
        <input v-model="email" type="email" class="input mt-1.5" placeholder="esposa@exemplo.com" />
      </label>
      <button type="submit" class="btn btn-primary" :disabled="busy">
        <AppIcon name="search" :size="16" /> Buscar
      </button>
    </form>

    <p v-if="message" class="text-sm text-ink-soft" role="status">{{ message }}</p>

    <div v-if="result?.found" class="card flex items-center justify-between gap-3 p-4">
      <RouterLink :to="`/u/${result.id}`" class="flex items-center gap-3">
        <Avatar :name="result.name" :size="40" />
        <span class="font-medium text-ink">{{ result.name }}</span>
      </RouterLink>
      <button v-busy="busy" class="btn btn-sm" :class="result.isFollowing ? 'btn-secondary' : 'btn-primary'" :disabled="busy" @click="toggle(result)">
        <AppIcon :name="result.isFollowing ? 'check' : 'plus'" :size="15" />
        {{ result.isFollowing ? 'Seguindo' : 'Seguir' }}
      </button>
    </div>

    <div class="space-y-3">
      <h2 class="eyebrow">Seguindo</h2>
      <div v-if="followingLoading" class="space-y-2">
        <SkeletonBlock v-for="n in 2" :key="`skeleton-${n}`" class="h-12 w-full rounded-2xl" />
      </div>
      <ul v-else-if="following.length" class="divide-y divide-line/60 overflow-hidden rounded-2xl border border-line">
        <li v-for="person in following" :key="person.id" class="flex items-center justify-between px-4 py-3">
          <RouterLink :to="`/u/${person.id}`" class="flex items-center gap-3">
            <Avatar :name="person.name" :size="32" />
            <span class="text-sm font-medium text-ink">{{ person.name }}</span>
          </RouterLink>
          <button v-busy="busy" class="btn btn-ghost btn-sm" :disabled="busy" @click="toggle({ id: person.id, isFollowing: true })">Deixar de seguir</button>
        </li>
      </ul>
      <p v-else class="text-sm text-ink-mute">Você ainda não segue ninguém.</p>
    </div>

    <ConfirmDialog
      :open="pendingUnfollow !== null"
      title="Deixar de seguir?"
      :message="`Você deixará de ver as publicações de ${pendingUnfollow?.name ?? 'esta pessoa'} no seu mural.`"
      confirm-label="Deixar de seguir"
      danger
      @confirm="confirmUnfollow"
      @cancel="pendingUnfollow = null"
    />
  </section>
</template>
