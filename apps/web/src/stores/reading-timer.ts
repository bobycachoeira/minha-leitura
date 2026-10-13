import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

const KEY = 'ml.session'

interface Persisted {
  bookId: string | null
  startedAt: number | null
  accumulated: number
}

/** Reading timer that survives navigation/reload (persisted in localStorage). */
export const useReadingTimerStore = defineStore('readingTimer', () => {
  const stored = (() => {
    try {
      return JSON.parse(localStorage.getItem(KEY) ?? 'null') as Persisted | null
    } catch {
      return null
    }
  })()

  const bookId = ref<string | null>(stored?.bookId ?? null)
  const startedAt = ref<number | null>(stored?.startedAt ?? null)
  const accumulated = ref<number>(stored?.accumulated ?? 0)
  const now = ref(Date.now())
  let interval: ReturnType<typeof setInterval> | null = null

  function persist(): void {
    localStorage.setItem(
      KEY,
      JSON.stringify({ bookId: bookId.value, startedAt: startedAt.value, accumulated: accumulated.value }),
    )
  }

  function ensureTicker(): void {
    if (interval) return
    interval = setInterval(() => {
      now.value = Date.now()
    }, 1000)
  }

  const running = computed(() => startedAt.value !== null)
  const elapsedSeconds = computed(
    () => accumulated.value + (startedAt.value ? Math.floor((now.value - startedAt.value) / 1000) : 0),
  )
  const elapsedMinutes = computed(() => Math.max(1, Math.round(elapsedSeconds.value / 60)))

  function start(id: string): void {
    bookId.value = id
    startedAt.value = Date.now()
    accumulated.value = 0
    ensureTicker()
    persist()
  }

  function pause(): void {
    if (startedAt.value === null) return
    accumulated.value += Math.floor((Date.now() - startedAt.value) / 1000)
    startedAt.value = null
    persist()
  }

  function resume(): void {
    if (running.value || !bookId.value) return
    startedAt.value = Date.now()
    ensureTicker()
    persist()
  }

  function reset(): void {
    bookId.value = null
    startedAt.value = null
    accumulated.value = 0
    persist()
  }

  return { bookId, running, elapsedSeconds, elapsedMinutes, start, pause, resume, reset }
})
