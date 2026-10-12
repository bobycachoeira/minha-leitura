import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { apiFetch } from '../api/client.js'
import { useSessionStore } from './session.js'

export interface AchievementRecord {
  id: string
  kind: 'meta_batida' | 'meta_nao_batida'
  created?: string
  payload: {
    metric: 'paginas' | 'livros'
    period?: string
    target: number
    progress: number
    startDate: string
    endDate: string
    streak: number
    books: string[]
  }
}

const ACK_KEY = 'ml.achv.ack'
const FORTY_EIGHT_H = 48 * 3600 * 1000

export const useAchievementsStore = defineStore('achievements', () => {
  const session = useSessionStore()
  const items = ref<AchievementRecord[]>([])
  const loading = ref(false)
  const ack = ref<string[]>(JSON.parse(localStorage.getItem(ACK_KEY) ?? '[]'))

  function persist(): void {
    localStorage.setItem(ACK_KEY, JSON.stringify(ack.value))
  }

  async function load(): Promise<void> {
    if (!session.spaceId) return
    loading.value = true
    try {
      items.value = await apiFetch<AchievementRecord[]>('/api/achievements', {
        query: { space: session.spaceId },
      })
    } finally {
      loading.value = false
    }
  }

  function isNew(a: AchievementRecord): boolean {
    if (ack.value.includes(a.id)) return false
    const created = a.created ? new Date(a.created.replace(' ', 'T')).getTime() : 0
    return Date.now() - created < FORTY_EIGHT_H
  }

  const hasNew = computed(() => items.value.some(isNew))
  const newCount = computed(() => items.value.filter(isNew).length)

  function acknowledge(id: string): void {
    if (!ack.value.includes(id)) {
      ack.value = [...ack.value, id]
      persist()
    }
  }

  function acknowledgeAll(): void {
    ack.value = items.value.map((a) => a.id)
    persist()
  }

  return { items, loading, hasNew, newCount, load, isNew, acknowledge, acknowledgeAll }
})
