import { ref } from 'vue'
import { registerSW } from 'virtual:pwa-register'

/** Aviso visível enquanto o app está em uso. */
export const needRefresh = ref(false)

/** Existe uma versão nova aguardando, mesmo que o aviso tenha sido dispensado. */
const updateAvailable = ref(false)

let updateSW: ((reloadPage?: boolean) => Promise<void>) | null = null
const bootedAt = Date.now()

export function initPwaUpdate(): void {
  updateSW = registerSW({
    onNeedRefresh() {
      updateAvailable.value = true
      needRefresh.value = true
      // Em uma abertura/reabertura recente, aplica direto. Durante o uso, avisa.
      if (Date.now() - bootedAt < 15_000) {
        void applyUpdate()
      }
    },
  })

  // Verifica updates periodicamente e ao voltar o foco.
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then((registration) => {
        const check = (): void => {
          void registration.update()
        }
        setInterval(check, 5 * 60 * 1000)
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState !== 'visible') return
          // Ao reabrir/voltar para o app, aplica o que estava pendente.
          if (updateAvailable.value) {
            void applyUpdate()
            return
          }
          check()
        })
      })
      .catch(() => {
        // no service worker (dev) — ignore
      })
  }
}

export async function applyUpdate(): Promise<void> {
  updateAvailable.value = false
  needRefresh.value = false
  if (updateSW) await updateSW(true)
}

export function dismissUpdate(): void {
  // Esconde o aviso; a atualização continua pendente e será aplicada na próxima volta.
  needRefresh.value = false
}
