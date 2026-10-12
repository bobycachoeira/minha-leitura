<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { requestMagicLink, verifyMagicLink } from '../../api/auth-api.js'
import { useSessionStore } from '../../stores/session.js'
import AppIcon from '../../components/AppIcon.vue'

const route = useRoute()
const router = useRouter()
const session = useSessionStore()

const email = ref('')
const status = ref<string | null>(null)
const busy = ref(false)

async function sendLink(): Promise<void> {
  if (!email.value.trim()) return
  busy.value = true
  status.value = null
  try {
    await requestMagicLink(email.value.trim())
    status.value = 'Se o e-mail existir, enviamos um link de acesso.'
  } catch {
    status.value = 'Não foi possível enviar o link agora.'
  } finally {
    busy.value = false
  }
}

async function consumeToken(token: string): Promise<void> {
  busy.value = true
  status.value = null
  try {
    const result = await verifyMagicLink(token)
    if (result.stepUpRequired && result.userId) {
      session.setUser({ id: result.userId })
      await router.push({ name: 'two-factor', query: { userId: result.userId } })
      return
    }
    if (result.token && result.record) {
      session.setToken(result.token)
      session.setUser({ id: result.record.id, email: result.record.email, name: result.record.name })
      const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/'
      await router.push(redirect)
    }
  } catch {
    status.value = 'Link inválido ou expirado.'
  } finally {
    busy.value = false
  }
}

onMounted(() => {
  const token = route.query.token
  if (typeof token === 'string') void consumeToken(token)
})
</script>

<template>
  <div class="app-shell paper-grain grid min-h-full place-items-center px-4 py-10">
    <div class="relative z-10 w-full max-w-sm">
      <div class="mb-6 text-center">
        <span class="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-oxblood text-white shadow-book">
          <AppIcon name="books" :size="28" />
        </span>
        <h1 class="brand-mark mt-4 text-2xl text-ink">Minha Leitura</h1>
        <p class="eyebrow mt-1">minha estante de leitura</p>
      </div>

      <div class="card space-y-4 p-6">
        <div>
          <h2 class="display-hero text-2xl">Entrar</h2>
          <p class="mt-1 text-sm text-ink-soft">Sem senha. Enviamos um link mágico para o seu e-mail.</p>
        </div>

        <form class="space-y-3" @submit.prevent="sendLink">
          <label class="block">
            <span class="label">E-mail</span>
            <input v-model="email" type="email" required autocomplete="email" class="input mt-1.5" placeholder="voce@exemplo.com" />
          </label>
          <button v-busy="busy" type="submit" class="btn btn-primary w-full" :disabled="busy">
            {{ busy ? 'Enviando…' : 'Enviar link de acesso' }}
          </button>
        </form>

        <p v-if="status" class="text-sm text-ink-soft" role="status">{{ status }}</p>
      </div>
      <p class="mt-6 text-center text-xs text-ink-mute">Sua estante de leitura — com espaço para compartilhar.</p>
    </div>
  </div>
</template>
