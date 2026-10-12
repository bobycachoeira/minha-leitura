import { defineStore } from 'pinia'
import { ref } from 'vue'
import { apiFetch } from '../api/client.js'
import { useSessionStore } from './session.js'
import { useSyncStore } from './sync.js'
import { useLibraryStore } from './library.js'

export interface RecommendationItem {
  id: string
  title: string
  authors: string[]
  cover_url?: string
  reason: string
  source: string
  score: number
}

export const useRecommendationsStore = defineStore('recommendations', () => {
  const session = useSessionStore()
  const items = ref<RecommendationItem[]>([])
  const loading = ref(false)

  async function load(): Promise<void> {
    if (!session.spaceId) return
    loading.value = true
    try {
      items.value = await apiFetch<RecommendationItem[]>('/api/recommendations', {
        query: { space: session.spaceId },
      })
    } finally {
      loading.value = false
    }
  }

  async function dismiss(id: string): Promise<void> {
    if (!session.spaceId) return
    await apiFetch(`/api/recommendations/${id}/dismiss`, { method: 'POST', query: { space: session.spaceId } })
    await load()
  }

  /** Adds the suggestion to the collection with the chosen status. */
  async function add(id: string, status: 'quero_ler' | 'lendo' = 'quero_ler'): Promise<void> {
    if (!session.spaceId) return
    await apiFetch(`/api/recommendations/${id}/add`, {
      method: 'POST',
      query: { space: session.spaceId },
      body: { status },
    })
    // Mirror the new records locally so the shelf/wishlist updates immediately.
    await useSyncStore().pull()
    await useLibraryStore().load()
    await load()
  }

  return { items, loading, load, dismiss, add }
})
