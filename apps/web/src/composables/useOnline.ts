import { onBeforeUnmount, onMounted, ref, type Ref } from 'vue'

/** Reactive online/offline state (T052). */
export function useOnline(): { isOnline: Ref<boolean> } {
  const isOnline = ref(typeof navigator === 'undefined' ? true : navigator.onLine)

  function update(): void {
    isOnline.value = navigator.onLine
  }

  onMounted(() => {
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
  })

  onBeforeUnmount(() => {
    window.removeEventListener('online', update)
    window.removeEventListener('offline', update)
  })

  return { isOnline }
}
