<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { verify2fa } from '../../api/auth-api.js'
import { useSessionStore } from '../../stores/session.js'
import AppIcon from '../../components/AppIcon.vue'

const route = useRoute()
const router = useRouter()
const session = useSessionStore()

const code = ref('')
const error = ref<string | null>(null)
const busy = ref(false)

async function submit(): Promise<void> {
  const userId = typeof route.query.userId === 'string' ? route.query.userId : session.user?.id
  if (!userId || code.value.length < 6) {
    error.value = 'Informe o código de 6 dígitos.'
    return
  }
  busy.value = true
  error.value = null
  try {
    const result = await verify2fa(userId, code.value)
    session.setToken(result.token)
    session.setUser({ id: result.record.id, email: result.record.email, name: result.record.name })
    session.applyStepUp(result.meta?.stepUpToken ?? null)
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/'
    await router.push(redirect)
  } catch {
    error.value = 'Código inválido.'
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="app-shell paper-grain grid min-h-full place-items-center px-4 py-10">
    <div class="relative z-10 w-full max-w-sm">
      <div class="mb-6 text-center">
        <span class="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-ink text-paper shadow-book">
          <AppIcon name="target" :size="26" />
        </span>
      </div>
      <div class="card space-y-4 p-6">
        <div>
          <h2 class="display-hero text-2xl">Verificação em duas etapas</h2>
          <p class="mt-1 text-sm text-ink-soft">Digite o código do seu app autenticador.</p>
        </div>
        <form class="space-y-3" @submit.prevent="submit">
          <input
            v-model="code"
            inputmode="numeric"
            autocomplete="one-time-code"
            maxlength="6"
            placeholder="••••••"
            class="input text-center font-mono text-2xl tracking-[0.5em]"
          />
          <button v-busy="busy" type="submit" class="btn btn-primary w-full" :disabled="busy">Verificar</button>
        </form>
        <p v-if="error" class="text-sm text-oxblood" role="alert">{{ error }}</p>
      </div>
    </div>
  </div>
</template>
