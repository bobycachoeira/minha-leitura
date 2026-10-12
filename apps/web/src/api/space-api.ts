import { apiFetch } from './client.js'

export interface Space {
  id: string
  name: string
  created_by: string
}

export async function listSpaces(): Promise<Space[]> {
  return apiFetch('/api/spaces')
}

export async function createSpace(name: string): Promise<Space> {
  return apiFetch('/api/spaces', { method: 'POST', body: { name } })
}

export interface SpaceMemberItem {
  id: string
  user: string
  name: string
  role: string
  isSelf: boolean
}

export async function listMembers(spaceId: string): Promise<SpaceMemberItem[]> {
  return apiFetch(`/api/spaces/${spaceId}/members`)
}

export async function createInvite(
  spaceId: string,
  email: string,
  role: 'partner' | 'viewer',
): Promise<{ inviteId: string; token: string }> {
  return apiFetch(`/api/spaces/${spaceId}/invites`, { method: 'POST', stepUp: true, body: { email, role } })
}

export async function acceptInvite(token: string): Promise<{ spaceId: string }> {
  return apiFetch('/api/invites/accept', { method: 'POST', body: { token } })
}

export async function changeMemberRole(
  spaceId: string,
  userId: string,
  role: 'owner' | 'partner' | 'viewer',
): Promise<void> {
  await apiFetch(`/api/spaces/${spaceId}/members/${userId}`, {
    method: 'PATCH',
    stepUp: true,
    body: { role },
  })
}
