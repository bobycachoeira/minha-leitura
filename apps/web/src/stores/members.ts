import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { listMembers, type SpaceMemberItem } from '../api/space-api.js'
import { useSessionStore } from './session.js'

/**
 * Members of the current space. Used to separate each person's reading and to
 * drive the "Eu / parceiro" selector and the duel.
 */
export const useMembersStore = defineStore('members', () => {
  const session = useSessionStore()
  const members = ref<SpaceMemberItem[]>([])
  const loading = ref(false)
  let loadedFor: string | null = null

  async function load(force = false): Promise<void> {
    if (!session.spaceId) {
      members.value = []
      loadedFor = null
      return
    }
    if (!force && loadedFor === session.spaceId && members.value.length > 0) return
    loading.value = true
    try {
      members.value = await listMembers(session.spaceId)
      loadedFor = session.spaceId
    } catch {
      // keep previous members on transient errors
    } finally {
      loading.value = false
    }
  }

  const me = computed(() => members.value.find((m) => m.isSelf) ?? null)
  const partner = computed(() => members.value.find((m) => !m.isSelf) ?? null)
  const hasPartner = computed(() => members.value.length > 1)

  function nameOf(userId: string): string {
    return members.value.find((m) => m.user === userId)?.name ?? userId
  }

  watch(
    () => session.spaceId,
    () => void load(),
  )

  return { members, loading, me, partner, hasPartner, nameOf, load }
})
