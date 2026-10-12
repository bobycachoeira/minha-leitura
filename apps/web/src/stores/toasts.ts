import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { RouteLocationRaw } from 'vue-router'

export interface Toast {
  id: number
  message: string
  kind: 'success' | 'info' | 'error'
  to?: RouteLocationRaw
}

export const useToastsStore = defineStore('toasts', () => {
  const items = ref<Toast[]>([])
  let seq = 0

  function dismiss(id: number): void {
    items.value = items.value.filter((t) => t.id !== id)
  }

  function push(
    message: string,
    options: { kind?: 'success' | 'info' | 'error'; ms?: number; to?: RouteLocationRaw } = {},
  ): void {
    const id = (seq += 1)
    items.value = [...items.value, { id, message, kind: options.kind ?? 'success', to: options.to }]
    setTimeout(() => dismiss(id), options.ms ?? 6000)
  }

  return { items, push, dismiss }
})
