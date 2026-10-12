<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { updateProfile } from '../../api/auth-api.js'
import { useSessionStore } from '../../stores/session.js'
import AppIcon from '../../components/AppIcon.vue'
import Avatar from '../../components/Avatar.vue'
import NotificationsSettings from '../settings/NotificationsSettings.vue'

const session = useSessionStore()
const name = ref(session.user?.name ?? '')
const bio = ref(session.user?.bio ?? '')
const avatar = ref(session.user?.avatar ?? '')
const saving = ref(false)
const message = ref<string | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)

const bioLen = computed(() => bio.value.length)

function pickPhoto(): void {
  fileInput.value?.click()
}

function resizeImage(file: File, max: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        const scale = Math.max(max / img.width, max / img.height)
        const w = Math.round(img.width * scale)
        const h = Math.round(img.height * scale)
        const canvas = document.createElement('canvas')
        canvas.width = max
        canvas.height = max
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('canvas'))
          return
        }
        ctx.drawImage(img, -(w - max) / 2, -(h - max) / 2, w, h)
        resolve(canvas.toDataURL('image/jpeg', 0.82))
      }
      img.onerror = reject
      img.src = reader.result as string
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

async function onFile(event: Event): Promise<void> {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  try {
    avatar.value = await resizeImage(file, 256)
    message.value = 'Foto pronta — clique em Salvar.'
  } catch {
    message.value = 'Não foi possível processar a imagem.'
  }
}

async function save(): Promise<void> {
  const value = name.value.trim()
  if (value.length < 1) {
    message.value = 'Informe seu nome.'
    return
  }
  saving.value = true
  message.value = null
  try {
    const updated = await updateProfile({ name: value, bio: bio.value, avatarData: avatar.value })
    session.setUser({
      id: updated.id,
      email: updated.email,
      name: updated.name,
      bio: updated.bio,
      avatar: updated.avatar,
    })
    message.value = 'Perfil atualizado.'
  } catch {
    message.value = 'Não foi possível salvar agora.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <section class="space-y-5">
    <header>
      <p class="eyebrow flex items-center gap-1.5"><AppIcon name="users" :size="14" /> Sua conta</p>
      <h1 class="display-hero mt-1 text-3xl">Meu perfil</h1>
    </header>

    <form class="card space-y-5 p-5" @submit.prevent="save">
      <div class="flex items-center gap-4">
        <Avatar :name="name || session.user?.name" :src="avatar" :size="72" />
        <div class="space-y-2">
          <button type="button" class="btn btn-secondary btn-sm" @click="pickPhoto">
            <AppIcon name="edit" :size="15" /> Trocar foto
          </button>
          <button v-if="avatar" type="button" class="block text-xs text-ink-mute underline" @click="avatar = ''">
            Remover foto
          </button>
          <input ref="fileInput" type="file" accept="image/*" class="hidden" @change="onFile" />
        </div>
      </div>

      <label class="block">
        <span class="label">Nome</span>
        <input v-model="name" class="input mt-1.5" maxlength="80" placeholder="Como você quer aparecer" />
      </label>

      <label class="block">
        <span class="label">Sobre mim</span>
        <textarea
          v-model="bio"
          rows="3"
          maxlength="280"
          class="textarea mt-1.5"
          placeholder="Fale um pouco sobre seus gostos de leitura…"
        />
        <span class="mt-1 block text-right text-xs text-ink-mute">{{ bioLen }}/280</span>
      </label>

      <label class="block">
        <span class="label">E-mail</span>
        <input :value="session.user?.email" class="input mt-1.5 opacity-60" disabled />
      </label>

      <div class="flex flex-wrap items-center justify-between gap-2">
        <RouterLink v-if="session.user?.id" :to="`/u/${session.user.id}`" class="btn btn-secondary btn-sm">
          <AppIcon name="users" :size="15" /> Ver meu perfil público
        </RouterLink>
        <button v-busy="saving" type="submit" class="btn btn-primary" :disabled="saving">
          <AppIcon name="check" :size="16" /> Salvar
        </button>
      </div>
      <p v-if="message" class="text-sm text-ink-soft" role="status">{{ message }}</p>
    </form>

    <NotificationsSettings />
  </section>
</template>
