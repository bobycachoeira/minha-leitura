<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { acceptInvite, createInvite, createSpace, listSpaces } from '../../api/space-api.js'
import { useSessionStore } from '../../stores/session.js'
import AppIcon from '../../components/AppIcon.vue'

const router = useRouter()
const session = useSessionStore()

const name = ref('')
const inviteEmail = ref('')
const inviteRole = ref<'partner' | 'viewer'>('partner')
const inviteToken = ref<string | null>(null)
const acceptToken = ref('')
const status = ref<string | null>(null)
const busy = ref(false)

async function loadSpaces(): Promise<void> {
  try {
    const spaces = await listSpaces()
    if (spaces.length > 0 && spaces[0]) {
      session.setSpace(spaces[0].id)
      await router.push('/')
    }
  } catch {
    // allow creating a space below
  }
}
async function submitSpace(): Promise<void> {
  if (!name.value.trim()) return
  busy.value = true
  try {
    const space = await createSpace(name.value.trim())
    session.setSpace(space.id)
    await router.push('/')
  } finally {
    busy.value = false
  }
}

async function submitInvite(): Promise<void> {
  if (!session.spaceId || !inviteEmail.value.trim()) return
  busy.value = true
  try {
    const result = await createInvite(session.spaceId, inviteEmail.value.trim(), inviteRole.value)
    inviteToken.value = result.token
    status.value = 'Convite criado (válido por 30 min).'
  } catch {
    status.value = 'Não foi possível criar o convite (a ação exige 2FA).'
  } finally {
    busy.value = false
  }
}

async function submitAccept(): Promise<void> {
  if (!acceptToken.value.trim()) return
  busy.value = true
  try {
    const result = await acceptInvite(acceptToken.value.trim())
    session.setSpace(result.spaceId)
    await router.push('/')
  } catch {
    status.value = 'Convite inválido ou expirado.'
  } finally {
    busy.value = false
  }
}

onMounted(loadSpaces)
</script>

<template>
  <div class="app-shell paper-grain min-h-full px-4 py-10">
    <div class="relative z-10 mx-auto max-w-md space-y-5">
      <header class="text-center">
        <span class="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-oxblood text-white shadow-book">
          <AppIcon name="space" :size="26" />
        </span>
        <h1 class="display-hero mt-4 text-3xl">Seu espaço de leitura</h1>
        <p class="mt-1 text-sm text-ink-soft">Crie seu espaço e, se quiser, convide alguém para acompanhar.</p>
      </header>

      <form class="card space-y-3 p-5" @submit.prevent="submitSpace">
        <p class="eyebrow">Criar espaço</p>
        <label class="block">
          <span class="label">Nome do espaço</span>
          <input v-model="name" required class="input mt-1.5" placeholder="Ex.: Nosso cantinho" />
        </label>
        <button type="submit" class="btn btn-primary w-full" :disabled="busy">Criar espaço</button>
      </form>

      <div class="card space-y-3 p-5">
        <p class="eyebrow">Convidar</p>
        <div class="flex flex-col gap-2 sm:flex-row">
          <input v-model="inviteEmail" type="email" placeholder="email@exemplo.com" class="input flex-1" />
          <select v-model="inviteRole" class="select sm:w-36">
            <option value="partner">Parceira</option>
            <option value="viewer">Só leitura</option>
          </select>
          <button type="button" class="btn btn-ink" :disabled="busy" @click="submitInvite">Convidar</button>
        </div>
        <p v-if="inviteToken" class="break-all rounded-xl bg-paper-sunken px-3 py-2 text-xs text-ink-soft">
          Token: {{ inviteToken }}
        </p>
      </div>

      <form class="card space-y-3 p-5" @submit.prevent="submitAccept">
        <p class="eyebrow">Aceitar convite</p>
        <input v-model="acceptToken" placeholder="Cole o token do convite" class="input" />
        <button type="submit" class="btn btn-secondary w-full" :disabled="busy">Aceitar</button>
      </form>

      <p v-if="status" class="text-center text-sm text-ink-soft" role="status">{{ status }}</p>
    </div>
  </div>
</template>
