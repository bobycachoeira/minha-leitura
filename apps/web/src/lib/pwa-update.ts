import { ref } from 'vue'
import { registerSW } from 'virtual:pwa-register'

/** True when a new build is ready and waiting for the user to update. */
export const needRefresh = ref(false)

let updateSW: ((reloadPage?: boolean) => Promise<void>) | null = null

export function initPwaUpdate(): void {
  updateSW = registerSW({
    onNeedRefresh() {
      needRefresh.value = true
    },
  })

  // Check for updates periodically and whenever the app regains focus, so the
  // "new version" notice shows up without needing a manual reload.
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then((registration) => {
        const check = (): void => {
          void registration.update()
        }
        setInterval(check, 30 * 60 * 1000)
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
