import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface DiagError {
  id: number
  at: string
  source: string
  message: string
}

const KEY = 'ml.errors'
const MAX = 50

export const useErrorsStore = defineStore('errors', () => {
  const items = ref<DiagError[]>(JSON.parse(localStorage.getItem(KEY) ?? '[]'))

  function persist(): void {
    localStorage.setItem(KEY, JSON.stringify(items.value.slice(0, MAX)))
  }

  function logError(source: string, message: string): void {
    const id = (items.value[0]?.id ?? 0) + 1
    items.value = [{ id, at: new Date().toISOString(), source, message }, ...items.value].slice(0, MAX)
    persist()
  }

  function clear(): void {
    items.value = []
    persist()
  }

  return { items, logError, clear }
})
