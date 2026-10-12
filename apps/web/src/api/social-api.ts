import { apiFetch } from './client.js'

export interface PersonResult {
  found: boolean
  id?: string
  name?: string
  isFollowing?: boolean
  self?: boolean
}

export interface Following {
  id: string
  name: string
}

export interface PublicProfile {
  id: string
  name: string
  bio?: string
  avatar?: string
  isSelf: boolean
  isFollowing: boolean
  followers: number
  following: number
  posts: number
  likes?: number
  comments?: number
}

export interface AppNotification {
  id: string
  kind: 'like' | 'comment' | 'follow' | 'post' | 'period'
  actor?: string
  body?: string
  post?: string
  comment?: string
  is_read?: boolean
  created?: string
  actorName: string
  actorAvatar?: string
}

export interface NotificationsResult {
  items: AppNotification[]
  unread: number
}

export async function getNotifications(): Promise<NotificationsResult> {
  return apiFetch('/api/notifications')
}

export async function markNotificationsRead(): Promise<void> {
  await apiFetch('/api/notifications/read', { method: 'POST' })
}

export interface PublicPost {
  id: string
  summary: string
  kind: string
  created?: string
  authorId: string
  authorName: string
  authorAvatar?: string
  reactionsCount?: number
  commentsCount?: number
}

export async function findPerson(email: string): Promise<PersonResult> {
  return apiFetch('/api/people', { query: { email } })
}

export async function listFollowing(): Promise<Following[]> {
  return apiFetch('/api/following')
}

export async function getProfile(id: string): Promise<PublicProfile> {
  return apiFetch(`/api/users/${id}/profile`)
}

export async function getUserPosts(id: string): Promise<PublicPost[]> {
  return apiFetch(`/api/users/${id}/posts`)
}

export async function follow(id: string): Promise<void> {
  await apiFetch(`/api/users/${id}/follow`, { method: 'POST' })
}

export async function unfollow(id: string): Promise<void> {
  await apiFetch(`/api/users/${id}/follow`, { method: 'DELETE' })
}
