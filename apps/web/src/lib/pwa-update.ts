import { ref } from 'vue'
import { registerSW } from 'virtual:pwa-register'

/** Mantido por compatibilidade; o auto-update não espera ação do usuário. */
export const needRefresh = ref(false)

let updateSW: ((reloadPage?: boolean) => Promise<void>) | null = null

export function initPwaUpdate(): void {
  let applying = false
  updateSW = registerSW({
    onNeedRefresh() {
      // Apply the new version automatically; no prompt and no manual reload.
      if (applying) return
      applying = true
      void updateSW?.(true)
    },
  })

  // Check for updates periodically and whenever the app regains focus.
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then((registration) => {
        const check = (): void => {
          void registration.update()
        }
        setInterval(check, 5 * 60 * 1000)
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') check()
        })
      })
      .catch(() => {
        // no service worker (dev) — ignore
      })
  }
}

export async function applyUpdate(): Promise<void> {
  if (updateSW) await updateSW(true)
}

export function dismissUpdate(): void {
  needRefresh.value = false
}
