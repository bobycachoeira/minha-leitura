<script setup lang="ts">
import { applyUpdate, dismissUpdate, needRefresh } from '../lib/pwa-update.js'
import AppIcon from './AppIcon.vue'
</script>

<template>
  <Transition name="page">
    <div
      v-if="needRefresh"
      class="fixed inset-x-0 bottom-20 z-40 mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-line bg-paper px-4 py-3 shadow-book"
    >
      <AppIcon name="sync" :size="18" class="shrink-0 text-oxblood" />
      <p class="flex-1 text-sm text-ink">Nova versão disponível.</p>
      <button class="btn btn-primary btn-sm" @click="applyUpdate">Atualizar</button>
      <button class="btn btn-ghost btn-sm text-ink-mute" @click="dismissUpdate">Depois</button>
    </div>
  </Transition>
</template>
