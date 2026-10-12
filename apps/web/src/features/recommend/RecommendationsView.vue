<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRecommendationsStore } from '../../stores/recommendations.js'
import { normalizeCoverUrl } from '../../api/catalog.js'
import BookCover from '../library/BookCover.vue'
import AppIcon from '../../components/AppIcon.vue'

const recommendations = useRecommendationsStore()
const busyId = ref<string | null>(null)

async function onAdd(id: string, status: 'quero_ler' | 'lendo'): Promise<void> {
  busyId.value = id
  try {
    await recommendations.add(id, status)
  } finally {
    busyId.value = null
  }
}

async function onDismiss(id: string): Promise<void> {
  busyId.value = id
  try {
    await recommendations.dismiss(id)
  } finally {
    busyId.value = null
  }
}

onMounted(() => {
  void recommendations.load()
})
</script>

<template>
  <section class="space-y-5">
    <header>
      <p class="eyebrow flex items-center gap-1.5"><AppIcon name="compass" :size="14" /> Para você</p>
      <h1 class="display-hero mt-1 text-3xl">Descobrir</h1>
      <p class="mt-2 max-w-md text-sm text-ink-soft">
        Sugestões a partir do que já leram — escolha um <strong>Desejo</strong>, mande para a
        <strong>Estante</strong>, ou <strong>dispense</strong>.
      </p>
    </header>

    <p v-if="recommendations.loading" class="text-sm text-ink-mute">Procurando boas histórias…</p>

    <div v-else-if="recommendations.items.length === 0" class="card grid place-items-center gap-2 p-10 text-center">
      <AppIcon name="compass" :size="28" class="text-ink-mute" />
      <p class="text-sm text-ink-soft">
        Sem sugestões no momento. Termine e informe o gênero de um livro para afinarmos suas recomendações.
      </p>
    </div>

    <ul v-else class="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3">
      <li
        v-for="item in recommendations.items"
        :key="item.id"
        class="book-tile card animate-rise flex flex-col gap-3 p-3"
      >
        <BookCover
          :book-id="item.id"
          :title="item.title"
          :author="item.authors[0]"
          :cover-url="normalizeCoverUrl(item.cover_url)"
        />
        <div class="min-h-[3.4rem]">
          <p class="line-clamp-2-safe text-sm font-medium leading-snug text-ink">{{ item.title }}</p>
          <p class="truncate text-xs text-ink-mute">{{ item.authors.join(', ') }}</p>
          <p class="mt-1 flex items-start gap-1 text-xs italic text-oxblood">
            <AppIcon name="sparkles" :size="13" class="mt-0.5 shrink-0" />
            <span class="line-clamp-2-safe">{{ item.reason }}</span>
          </p>
        </div>
        <div class="mt-auto flex flex-wrap gap-1.5">
          <button v-busy="busyId === item.id" class="btn btn-secondary btn-sm flex-1" :disabled="busyId === item.id" @click="onAdd(item.id, 'quero_ler')">
            <AppIcon name="bookmark" :size="14" /> Desejo
          </button>
          <button v-busy="busyId === item.id" class="btn btn-primary btn-sm flex-1" :disabled="busyId === item.id" @click="onAdd(item.id, 'lendo')">
            Estante
          </button>
          <button
            class="btn btn-ghost btn-sm w-full"
            :disabled="busyId === item.id"
            @click="onDismiss(item.id)"
          >
            Dispensar
          </button>
        </div>
      </li>
    </ul>
  </section>
</template>
