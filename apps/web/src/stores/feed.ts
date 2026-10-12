import { defineStore } from 'pinia'
import { ref } from 'vue'
import { addComment, likeComment as likeCommentApi, listComments, listFeed, react, type CommentItem, type PostItem } from '../api/feed-api.js'
import { useSessionStore } from './session.js'

export const useFeedStore = defineStore('feed', () => {
  const session = useSessionStore()
  const posts = ref<PostItem[]>([])
  const comments = ref<Record<string, CommentItem[]>>({})
  const loading = ref(false)

  async function load(): Promise<void> {
    if (!session.spaceId) return
    loading.value = true
    try {
      posts.value = await listFeed(session.spaceId)
    } finally {
      loading.value = false
    }
  }

  async function toggleReaction(postId: string): Promise<void> {
    if (!session.spaceId) return
    // Optimistic update so the heart reflects the tap immediately.
    const post = posts.value.find((candidate) => candidate.id === postId)
    if (post) {
      const wasLiked = post.liked ?? false
      post.liked = !wasLiked
      post.reactionsCount = Math.max(0, (post.reactionsCount ?? 0) + (wasLiked ? -1 : 1))
    }
    try {
      await react(session.spaceId, postId)
    } finally {
      await load()
    }
  }

  async function loadComments(postId: string): Promise<void> {
    if (!session.spaceId) return
    comments.value[postId] = await listComments(session.spaceId, postId)
  }

  async function comment(postId: string, body: string, parent?: string): Promise<void> {
    if (!session.spaceId) return
    await addComment(session.spaceId, postId, body, parent)
    await loadComments(postId)
    await load()
  }

  async function likeComment(postId: string, commentId: string): Promise<void> {
    if (!session.spaceId) return
    const list = comments.value[postId]
    const target = list?.find((c) => c.id === commentId)
    if (target) {
      const wasLiked = target.liked ?? false
      target.liked = !wasLiked
      target.likesCount = Math.max(0, (target.likesCount ?? 0) + (wasLiked ? -1 : 1))
    }
    await likeCommentApi(session.spaceId, commentId)
    await loadComments(postId)
  }

  return { posts, comments, loading, load, toggleReaction, loadComments, comment, likeComment }
})
