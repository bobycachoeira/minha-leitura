import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { setAccessToken, setStepUpToken } from '../api/client.js'

export interface SessionUser {
  id: string
  name?: string
  email?: string
  bio?: string
  avatar?: string
}

const TOKEN_KEY = 'ml.token'
const SPACE_KEY = 'ml.space'
const USER_KEY = 'ml.user'

function readUser(): SessionUser | null {
  const raw = localStorage.getItem(USER_KEY)
  return raw ? (JSON.parse(raw) as SessionUser) : null
}

export const useSessionStore = defineStore('session', () => {
  const token = ref<string | null>(localStorage.getItem(TOKEN_KEY))
  const spaceId = ref<string | null>(localStorage.getItem(SPACE_KEY))
  const user = ref<SessionUser | null>(readUser())
  const requiresStepUp = ref(false)

  setAccessToken(token.value)

  const isAuthenticated = computed(() => token.value !== null)
  const hasSpace = computed(() => spaceId.value !== null)

  function setToken(next: string | null): void {
    token.value = next
    setAccessToken(next)
    if (next) localStorage.setItem(TOKEN_KEY, next)
    else localStorage.removeItem(TOKEN_KEY)
  }

  function setSpace(next: string | null): void {
    spaceId.value = next
    if (next) localStorage.setItem(SPACE_KEY, next)
    else localStorage.removeItem(SPACE_KEY)
  }

  function setUser(next: SessionUser | null): void {
    user.value = next
    if (next) localStorage.setItem(USER_KEY, JSON.stringify(next))
    else localStorage.removeItem(USER_KEY)
  }

  function applyStepUp(next: string | null): void {
    setStepUpToken(next)
    requiresStepUp.value = next === null
  }

  function logout(): void {
    setToken(null)
    setSpace(null)
    setUser(null)
    applyStepUp(null)
  }

  return {
    token,
    spaceId,
    user,
    requiresStepUp,
    isAuthenticated,
    hasSpace,
    setToken,
    setSpace,
    setUser,
    applyStepUp,
    logout,
  }
})
