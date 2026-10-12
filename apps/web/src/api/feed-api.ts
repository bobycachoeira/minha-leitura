import { apiFetch } from './client.js'

export interface PostItem {
  id: string
  type?: 'post' | 'notification'
  notifKind?: 'like' | 'comment' | 'follow'
  actor: string
  authorId?: string
  authorName?: string
  authorAvatar?: string
  kind: string
  summary: string
  body?: string
  visibility?: 'space' | 'public'
  liked?: boolean
  reactionsCount?: number
  commentsCount?: number
  achievement?: {
    kind: 'meta_batida' | 'meta_nao_batida'
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
  } | null
  created?: string
}

export interface CommentItem {
  id: string
  author: string
  authorName?: string
  authorAvatar?: string
  parent?: string
  body: string
  liked?: boolean
  likesCount?: number
  created?: string
}

export async function listFeed(space: string): Promise<PostItem[]> {
  return apiFetch('/api/feed', { query: { space } })
}

export async function createPost(
  space: string,
  kind: string,
  summary: string,
  refBook?: string,
  visibility: 'space' | 'public' = 'space',
  refAchievement?: string,
): Promise<PostItem> {
  return apiFetch('/api/posts', {
    method: 'POST',
    query: { space },
    body: { kind, summary, refBook, visibility, refAchievement },
  })
}

export async function react(space: string, postId: string, kind = 'curtir'): Promise<void> {
  await apiFetch(`/api/posts/${postId}/reactions`, { method: 'POST', query: { space }, body: { kind } })
}

export async function listComments(space: string, postId: string): Promise<CommentItem[]> {
  return apiFetch(`/api/posts/${postId}/comments`, { query: { space } })
}

export async function addComment(
  space: string,
  postId: string,
  body: string,
  parent?: string,
): Promise<CommentItem> {
  return apiFetch(`/api/posts/${postId}/comments`, {
    method: 'POST',
    query: { space },
    body: { body, parent },
  })
}

export async function likeComment(space: string, commentId: string): Promise<void> {
  await apiFetch(`/api/comments/${commentId}/reactions`, { method: 'POST', query: { space } })
}
