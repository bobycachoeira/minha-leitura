<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import AppIcon from './AppIcon.vue'

const route = useRoute()

const items = [
  { label: 'Início', to: '/', icon: 'home', match: ['/'] },
  { label: 'Estante', to: '/library', icon: 'books', match: ['/library'] },
  { label: 'Pessoas', to: '/people', icon: 'users', match: ['/people', '/u'] },
  { label: 'Descobrir', to: '/recommend', icon: 'compass', match: ['/recommend'] },
  { label: 'Metas', to: '/goals', icon: 'target', match: ['/goals'] },
]

const isActive = (match: string[]): boolean =>
  match.some((path) => (path === '/' ? route.path === '/' : route.path.startsWith(path)))

const activeLabel = computed(() => items.find((item) => isActive(item.match))?.label ?? '')
</script>

<template>
  <nav class="fixed inset-x-0 bottom-0 z-30 safe-bottom" aria-label="Navegação principal">
    <div
      class="mx-auto mb-3 flex max-w-md items-stretch gap-1 rounded-[1.4rem] border border-line bg-paper-raised/90 px-2 py-1.5 shadow-lift backdrop-blur-md"
    >
      <RouterLink
        v-for="item in items"
        :key="item.to"
        :to="item.to"
        class="nav-item"
        :class="{ 'nav-item-active': isActive(item.match) }"
        :aria-current="isActive(item.match) ? 'page' : undefined"
      >
        <AppIcon :name="item.icon" :size="21" class="nav-icon" />
        <span>{{ item.label }}</span>
      </RouterLink>
    </div>
    <span class="sr-only">Seção atual: {{ activeLabel }}</span>
  </nav>
</template>
