<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import AppIcon from '../../components/AppIcon.vue'

interface BarcodeDetectorLike {
  detect(source: HTMLVideoElement): Promise<Array<{ rawValue: string }>>
}
type BarcodeDetectorCtor = new (options: { formats: string[] }) => BarcodeDetectorLike

const emit = defineEmits<{ detected: [string]; close: [] }>()

const supported = ref(false)
const error = ref<string | null>(null)
const video = ref<HTMLVideoElement | null>(null)
let stream: MediaStream | null = null
let raf = 0
let detector: BarcodeDetectorLike | null = null

async function start(): Promise<void> {
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
    if (video.value) {
      video.value.srcObject = stream
      await video.value.play()
    }
    const Ctor = (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector
    if (Ctor) detector = new Ctor({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e'] })
    scan()
  } catch {
    error.value = 'Não foi possível acessar a câmera. Verifique a permissão.'
  }
}

async function scan(): Promise<void> {
  if (!detector || !video.value) return
  try {
    const codes = await detector.detect(video.value)
    if (codes.length > 0) {
      const value = String(codes[0]?.rawValue ?? '').replace(/[^0-9Xx]/g, '')
      if (value.length >= 10 && value.length <= 14) {
        emit('detected', value)
        stop()
        return
      }
    }
  } catch {
    // ignore frame decode errors
  }
  raf = requestAnimationFrame(() => {
    void scan()
  })
}

function stop(): void {
  cancelAnimationFrame(raf)
  if (stream) {
    stream.getTracks().forEach((track) => track.stop())
    stream = null
  }
}

onMounted(() => {
  supported.value = typeof window !== 'undefined' && 'BarcodeDetector' in window
  if (supported.value) void start()
})

onBeforeUnmount(stop)
</script>

<template>
  <div class="fixed inset-0 z-50 grid place-items-center bg-ink/70 p-4" @click.self="emit('close')">
    <div class="w-full max-w-sm space-y-3 rounded-2xl bg-paper p-4">
      <div class="flex items-center justify-between">
        <p class="eyebrow">Escanear ISBN</p>
        <button class="btn btn-ghost btn-sm !px-2" aria-label="Fechar" @click="emit('close')">
          <AppIcon name="close" :size="18" />
        </button>
      </div>
      <div v-if="!supported" class="text-sm text-ink-soft">
        Este navegador não suporta o scanner. Digite o ISBN no campo de busca.
      </div>
      <div v-else class="space-y-2">
        <video ref="video" class="w-full rounded-xl bg-black" playsinline muted />
        <p class="text-xs text-ink-mute">Aponte para o código de barras (ISBN-13).</p>
        <p v-if="error" class="text-sm text-oxblood">{{ error }}</p>
      </div>
    </div>
  </div>
</template>
