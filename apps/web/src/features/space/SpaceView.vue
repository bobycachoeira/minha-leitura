<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import {
  acceptInvite,
  createInvite,
  listMembers,
  listSpaces,
  type SpaceMemberItem,
} from '../../api/space-api.js'
import { useSessionStore } from '../../stores/session.js'
import { useToastsStore } from '../../stores/toasts.js'
import { ApiRequestError, getStepUpToken } from '../../api/client.js'
import AppIcon from '../../components/AppIcon.vue'
import Avatar from '../../components/Avatar.vue'

const PENDING_INVITE_KEY = 'ml.pending.invite'

const session = useSessionStore()
const toasts = useToastsStore()
const route = useRoute()

const spaceName = ref('')
const members = ref<SpaceMemberItem[]>([])
const inviteEmail = ref('')
const inviteRole = ref<'partner' | 'viewer'>('partner')
const inviteToken = ref<string | null>(null)
const acceptToken = ref('')
const busy = ref(false)

const inviteLink = computed(() =>
  inviteToken.value ? `${window.location.origin}/space?invite=${inviteToken.value}` : '',
)

async function copyInviteLink(): Promise<void> {
  if (!inviteLink.value) return
  try {
    await navigator.clipboard.writeText(inviteLink.value)
    toasts.push('Link copiado!')
  } catch {
    toasts.push('Não foi possível copiar — selecione o link manualmente.', { kind: 'error' })
  }
}

async function load(): Promise<void> {
  const spaces = await listSpaces()
  const current = spaces.find((s) => s.id === session.spaceId) ?? spaces[0]
  if (current) {
    spaceName.value = current.name
    session.setSpace(current.id)
    members.value = await listMembers(current.id)
  }
}

async function submitInvite(): Promise<void> {
  if (!session.spaceId || !inviteEmail.value.trim()) return
  busy.value = true
  try {
    const result = await createInvite(session.spaceId, inviteEmail.value.trim(), inviteRole.value)
    inviteToken.value = result.token
    sessionStorage.removeItem(PENDING_INVITE_KEY)
    toasts.push('Convite criado (válido 30 min).')
  } catch (err) {
    if (err instanceof ApiRequestError && err.code === 'step_up_required') {
      // Remember it so we can retry automatically after the 2FA step-up.
      sessionStorage.setItem(
        PENDING_INVITE_KEY,
        JSON.stringify({ email: inviteEmail.value.trim(), role: inviteRole.value }),
      )
    } else {
      sessionStorage.removeItem(PENDING_INVITE_KEY)
    }
  } finally {
    busy.value = false
  }
}

/** Retries a convite that was interrupted by the 2FA step-up. */
async function resumePendingInvite(): Promise<void> {
  const raw = sessionStorage.getItem(PENDING_INVITE_KEY)
  if (!raw || !getStepUpToken()) return
  try {
    const pending = JSON.parse(raw) as { email: string; role: 'partner' | 'viewer' }
    inviteEmail.value = pending.email
    inviteRole.value = pending.role
    await submitInvite()
  } catch {
    sessionStorage.removeItem(PENDING_INVITE_KEY)
  }
}

async function submitAccept(): Promise<void> {
  if (!acceptToken.value.trim()) return
  busy.value = true
  try {
    const result = await acceptInvite(acceptToken.value.trim())
    session.setSpace(result.spaceId)
    toasts.push('Convite aceito!')
    acceptToken.value = ''
    await load()
  } catch {
    // error already toasted
  } finally {
    busy.value = false
  }
}

onMounted(async () => {
  await load()
  const invite = route.query.invite
  if (typeof invite === 'string' && invite) {
    acceptToken.value = invite
    await submitAccept()
  } else {
    await resumePendingInvite()
  }
})
</script>

<template>
  <section class="space-y-5">
    <header>
      <p class="eyebrow flex items-center gap-1.5"><AppIcon name="space" :size="14" /> Espaço</p>
      <h1 class="display-hero mt-1 text-3xl">{{ spaceName || 'Meu espaço' }}</h1>
      <p class="mt-1 text-sm text-ink-soft">
        O espaço reúne o acervo, as metas e o feed de quem faz parte.
      </p>
    </header>

    <div v-if="!session.hasSpace" class="card p-5 text-sm text-ink-soft">
      Você ainda não tem um espaço.
      <RouterLink to="/onboarding" class="font-semibold text-oxblood underline">Criar espaço</RouterLink>
    </div>

    <div v-else class="space-y-5">
      <div class="card p-5">
        <p class="eyebrow mb-3">Membros</p>
        <ul class="divide-y divide-line/60">
          <li v-for="m in members" :key="m.id" class="flex items-center gap-3 py-2">
            <Avatar :name="m.name" :size="30" />
            <span class="flex-1 text-sm text-ink-soft">{{ m.name }}</span>
            <span class="chip !py-0 text-[0.62rem]">{{ m.isSelf ? 'você' : m.role }}</span>
          </li>
        </ul>
      </div>

      <form class="card space-y-3 p-5" @submit.prevent="submitInvite">
        <p class="eyebrow">Convidar</p>
        <div class="flex flex-col gap-2 sm:flex-row">
          <input v-model="inviteEmail" type="email" placeholder="email@exemplo.com" class="input flex-1" />
          <select v-model="inviteRole" class="select sm:w-36">
            <option value="partner">Parceira(o)</option>
            <option value="viewer">Só leitura</option>
          </select>
          <button v-busy="busy" type="submit" class="btn btn-primary" :disabled="busy">Convidar</button>
        </div>
        <div v-if="inviteLink" class="space-y-2">
          <p class="break-all rounded-xl bg-paper-sunken px-3 py-2 text-xs text-ink-soft">{{ inviteLink }}</p>
          <button type="button" class="btn btn-secondary btn-sm w-full" @click="copyInviteLink">
            <AppIcon name="check" :size="15" /> Copiar link do convite
          </button>
          <p class="text-xs text-ink-mute">Válido por 30 min, uso único. Ela entra com o Magic Link e o convite é aceito sozinho.</p>
        </div>
        <p class="text-xs text-ink-mute">Convidar exige 2FA (step-up).</p>
      </form>

      <form class="card space-y-3 p-5" @submit.prevent="submitAccept">
        <p class="eyebrow">Aceitar convite</p>
        <div class="flex gap-2">
          <input v-model="acceptToken" placeholder="Cole o token do convite" class="input flex-1" />
          <button v-busy="busy" type="submit" class="btn btn-secondary" :disabled="busy">Aceitar</button>
        </div>
      </form>
    </div>
  </section>
</template>
