<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { initialsFor } from '../../lib/format.js'
import { fetchAndCacheCover, getCachedCover } from '../../db/cover-cache.js'
import { normalizeCoverUrl } from '../../api/catalog.js'

const props = defineProps<{
  bookId: string
  title: string
  author?: string
  coverUrl?: string | null
  ribbon?: boolean
}>()

const PALETTE = ['#7A2E2E', '#5C6B54', '#3F4A5A', '#8A5A2B', '#4B3A63', '#6B4B3A']
const failed = ref(false)
const objectUrl = ref<string | null>(null)
const directUrl = ref<string | null>(null)

const cover = computed(() => normalizeCoverUrl(props.coverUrl))

const hueIndex = computed(() => {
  const clean = props.title.trim().toLowerCase()
  let hash = 0
  for (let i = 0; i < clean.length; i++) hash = (hash * 31 + clean.charCodeAt(i)) >>> 0
  return hash % PALETTE.length
})

const placeholderColor = computed(() => PALETTE[hueIndex.value])
const initials = computed(() => initialsFor(props.title, props.author))
const displaySrc = computed(() => objectUrl.value ?? directUrl.value)

function revoke(): void {
  if (objectUrl.value) {
    URL.revokeObjectURL(objectUrl.value)
    objectUrl.value = null
  }
}

async function loadCover(): Promise<void> {
  failed.value = false
  revoke()
  directUrl.value = null
  if (!cover.value) return
  const cached = await getCachedCover(props.bookId)
  const blob = cached ?? (await fetchAndCacheCover(props.bookId, cover.value))
  if (blob) objectUrl.value = URL.createObjectURL(blob)
  else directUrl.value = cover.value
}

onMounted(loadCover)
watch(() => props.coverUrl, loadCover)
onBeforeUnmount(revoke)
</script>

<template>
  <div class="cover-frame">
    <span v-if="ribbon" class="ribbon" aria-hidden="true" />
    <img
      v-if="displaySrc && !failed"
      :src="displaySrc"
      :alt="`Capa de ${title}`"
      class="h-full w-full object-cover"
      loading="lazy"
      @error="failed = true"
    />
    <div
      v-else
      class="deckle flex h-full w-full flex-col items-center justify-center gap-1.5"
      :style="{ backgroundColor: placeholderColor }"
      role="img"
      :aria-label="`Capa indisponível para ${title}`"
      data-testid="cover-placeholder"
    >
      <span class="display-hero text-4xl text-white/95">{{ initials }}</span>
      <span class="h-px w-6 bg-white/40" />
    </div>
  </div>
</template>
