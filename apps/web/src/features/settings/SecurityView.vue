<script setup lang="ts">
import { onMounted, ref } from 'vue'
import QRCode from 'qrcode'
import { confirm2fa, fetchMe, listDevices, setup2fa } from '../../api/auth-api.js'
import { useToastsStore } from '../../stores/toasts.js'
import AppIcon from '../../components/AppIcon.vue'

interface Device {
  id: string
  label: string
}

const toasts = useToastsStore()

const enabled = ref(false)
const loading = ref(true)
const step = ref<'idle' | 'scan' | 'done'>('idle')
const secret = ref('')
const qr = ref('')
const code = ref('')
const recoveryCodes = ref<string[]>([])
const devices = ref<Device[]>([])
const busy = ref(false)

async function load(): Promise<void> {
  loading.value = true
  try {
    const me = await fetchMe()
    enabled.value = Boolean(me.twofaEnabled)
    const list = await listDevices()
    devices.value = Array.isArray(list) ? list : []
  } finally {
    loading.value = false
  }
}

async function beginSetup(): Promise<void> {
  busy.value = true
  try {
    const result = await setup2fa()
    secret.value = result.secret
    qr.value = await QRCode.toDataURL(result.otpauthUrl, { margin: 1, width: 220 })
    step.value = 'scan'
  } catch {
    toasts.push('Não foi possível iniciar a configuração do 2FA.', { kind: 'error' })
  } finally {
    busy.value = false
  }
}

async function confirm(): Promise<void> {
  if (code.value.trim().length < 6) return
  busy.value = true
  try {
    const result = await confirm2fa(code.value.trim())
    recoveryCodes.value = result.recoveryCodes
    enabled.value = true
    step.value = 'done'
    toasts.push('2FA ativado!', { kind: 'success' })
  } catch {
    toasts.push('Código inválido. Tente novamente.', { kind: 'error' })
  } finally {
    busy.value = false
  }
}

onMounted(load)
</script>

<template>
  <section class="space-y-5">
    <header>
      <p class="eyebrow flex items-center gap-1.5"><AppIcon name="target" :size="14" /> Segurança</p>
      <h1 class="display-hero mt-1 text-3xl">Verificação em duas etapas</h1>
      <p class="mt-1 text-sm text-ink-soft">Protege o acesso com um código do app autenticador (TOTP).</p>
    </header>

    <p v-if="loading" class="text-sm text-ink-mute">Carregando…</p>

    <div v-else class="card space-y-4 p-5">
      <div class="flex items-center justify-between gap-3">
        <span class="flex items-center gap-2 text-sm font-semibold text-ink">
          <AppIcon :name="enabled ? 'check' : 'bell'" :size="16" :class="enabled ? 'text-sage' : 'text-ink-mute'" />
          {{ enabled ? '2FA ativado' : '2FA desativado' }}
        </span>
        <button v-if="!enabled && step === 'idle'" v-busy="busy" class="btn btn-primary btn-sm" :disabled="busy" @click="beginSetup">
          Ativar 2FA
        </button>
      </div>

      <template v-if="step === 'scan'">
        <p class="text-sm text-ink-soft">
          Abra seu app autenticador (Google Authenticator, Authy…) e escaneie o código — ou digite o segredo manualmente.
        </p>
        <img v-if="qr" :src="qr" alt="QR Code do 2FA" class="mx-auto rounded-xl border border-line bg-white p-2" />
        <p class="break-all rounded-xl bg-paper-sunken px-3 py-2 text-center font-mono text-xs text-ink-soft">{{ secret }}</p>
        <label class="block">
          <span class="label">Código de 6 dígitos</span>
          <input v-model="code" inputmode="numeric" maxlength="6" placeholder="••••••" class="input mt-1.5 text-center font-mono tracking-[0.4em]" />
        </label>
        <div class="flex justify-end gap-2">
          <button class="btn btn-secondary" @click="step = 'idle'">Cancelar</button>
          <button v-busy="busy" class="btn btn-primary" :disabled="busy" @click="confirm">Confirmar</button>
        </div>
      </template>

      <template v-if="step === 'done'">
        <p class="text-sm font-semibold text-sage">Guarde seus códigos de recuperação (use se perder o app):</p>
        <div class="grid grid-cols-2 gap-2">
          <code v-for="rc in recoveryCodes" :key="rc" class="rounded-lg bg-paper-sunken px-3 py-1.5 text-center text-sm">{{ rc }}</code>
        </div>
      </template>
    </div>

    <div v-if="devices.length" class="card p-5">
      <p class="eyebrow mb-3">Dispositivos confiáveis</p>
      <ul class="divide-y divide-line/60">
        <li v-for="d in devices" :key="d.id" class="flex items-center justify-between py-2 text-sm">
          <span class="text-ink-soft">{{ d.label || d.id }}</span>
        </li>
      </ul>
    </div>
  </section>
</template>
