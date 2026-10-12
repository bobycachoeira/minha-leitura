/** T121 — Web Push (VAPID) opt-in subscription helper. */

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY ?? ''

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const normalized = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(normalized)
  return Uint8Array.from(raw, (char) => char.charCodeAt(0))
}

export function usePush() {
  const supported = 'serviceWorker' in navigator && 'PushManager' in window

  async function getSubscription(): Promise<PushSubscription | null> {
    if (!supported) return null
    try {
      const registration = await navigator.serviceWorker.ready
      return await registration.pushManager.getSubscription()
    } catch {
      return null
    }
  }

  async function subscribe(): Promise<PushSubscription | null> {
    if (!supported || !VAPID_PUBLIC_KEY) return null
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return null
    const registration = await navigator.serviceWorker.ready
    const existing = await registration.pushManager.getSubscription()
    if (existing) return existing
    return registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as unknown as BufferSource,
    })
  }

  async function unsubscribe(): Promise<void> {
    const subscription = await getSubscription()
    if (subscription) await subscription.unsubscribe()
  }

  function permission(): NotificationPermission | 'unsupported' {
    return supported ? Notification.permission : 'unsupported'
  }

  return { supported, subscribe, unsubscribe, getSubscription, permission }
}
