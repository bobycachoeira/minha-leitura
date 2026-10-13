import { apiFetch } from './client.js'

export interface AuthUser {
  id: string
  email: string
  name?: string
  bio?: string
  avatar?: string
  twofaEnabled?: boolean
  currentBook?: string
}

export interface AuthResponse {
  token: string
  record: { id: string; email: string; name?: string }
}

export interface VerifyMagicLinkResult {
  stepUpRequired?: boolean
  userId?: string
  token?: string
  record?: { id: string; email: string; name?: string }
}

const DEVICE_KEY = 'ml.device'

/** Stable per-browser device id used for trusted-device / step-up decisions. */
export function getDeviceId(): string {
  let id = localStorage.getItem(DEVICE_KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(DEVICE_KEY, id)
  }
  return id
}

export async function requestMagicLink(email: string): Promise<{ sent: boolean }> {
  return apiFetch('/api/auth/magic-link/request', { method: 'POST', auth: false, body: { email } })
}

export async function verifyMagicLink(token: string): Promise<VerifyMagicLinkResult> {
  return apiFetch('/api/auth/magic-link/verify', {
    method: 'POST',
    auth: false,
    body: { token, deviceId: getDeviceId() },
  })
}

export async function fetchMe(): Promise<AuthUser> {
  return apiFetch('/api/auth/me')
}

export async function updateProfile(input: {
  name?: string
  bio?: string
  avatarData?: string
  currentBook?: string
}): Promise<AuthUser> {
  return apiFetch('/api/auth/me', { method: 'PATCH', body: input })
}

export async function setup2fa(): Promise<{ secret: string; otpauthUrl: string }> {
  return apiFetch('/api/auth/2fa/setup', { method: 'POST' })
}

export async function confirm2fa(code: string): Promise<{ recoveryCodes: string[] }> {
  return apiFetch('/api/auth/2fa/confirm', { method: 'POST', body: { code } })
}

export async function verify2fa(
  userId: string,
  code: string,
): Promise<AuthResponse & { meta?: { stepUpToken?: string } }> {
  return apiFetch('/api/auth/2fa/verify', { method: 'POST', auth: false, body: { userId, code } })
}

export async function logout(): Promise<void> {
  await apiFetch('/api/auth/logout', { method: 'POST' })
}

export async function listDevices(): Promise<Array<{ id: string; label: string }>> {
  return apiFetch('/api/devices')
}
