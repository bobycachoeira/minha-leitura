<script setup lang="ts">
const props = defineProps<{ name: string; size?: number; fill?: boolean }>()

const ICONS: Record<string, string> = {
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/>',
  books:
    '<path d="M4 4h4v16H4z"/><path d="M10 4h4v16h-4z"/><path d="m17.5 5 3.5 1-3.8 14-3.5-1z"/>',
  target:
    '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1"/>',
  compass: '<circle cx="12" cy="12" r="8.5"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>',
  award: '<circle cx="12" cy="9" r="5"/><path d="M8.6 13.4 7 22l5-2.8L17 22l-1.6-8.6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4"/>',
  moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  check: '<path d="M4 12.5 9.5 18 20 6.5"/>',
  heart:
    '<path d="M12 20s-7-4.3-9.2-9A4.6 4.6 0 0 1 12 6a4.6 4.6 0 0 1 9.2 5c-2.2 4.7-9.2 9-9.2 9z"/>',
  comment: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 21l1.9-5.4A8 8 0 1 1 21 12z"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  edit: '<path d="M4 20h4l10-10-4-4L4 16z"/><path d="m14 6 4 4"/>',
  back: '<path d="M15 6l-6 6 6 6"/>',
  bookmark: '<path d="M7 4h10v17l-5-3.2L7 21z"/>',
  sparkles:
    '<path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6z"/><path d="M18 15l.8 2.2L21 18l-2.2.8L18 21l-.8-2.2L15 18l2.2-.8z"/>',
  users:
    '<circle cx="9" cy="8" r="3.2"/><path d="M3 20a6 6 0 0 1 12 0"/><path d="M16 5.5a3.2 3.2 0 0 1 0 6"/><path d="M17 14a6 6 0 0 1 4 6"/>',
  bell: '<path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6z"/><path d="M10 20a2 2 0 0 0 4 0"/>',
  logout: '<path d="M9 4H5v16h4"/><path d="M16 12H9"/><path d="m13 8 4 4-4 4"/>',
  sync: '<path d="M20 11a8 8 0 0 0-14-4"/><path d="M4 5v4h4"/><path d="M4 13a8 8 0 0 0 14 4"/><path d="M20 19v-4h-4"/>',
  space: '<path d="M4 5h16v14H4z"/><path d="M8 5v14"/>',
  camera: '<path d="M4 8h3l1.6-2h6.8L17 8h3v11H4z"/><circle cx="12" cy="13.2" r="3.3"/>',
}
</script>

<template>
  <!-- eslint-disable vue/no-v-html -- static, trusted icon markup -->
  <svg
    :width="props.size ?? 22"
    :height="props.size ?? 22"
    viewBox="0 0 24 24"
    :fill="props.fill ? 'currentColor' : 'none'"
    stroke="currentColor"
    stroke-width="1.7"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    v-html="ICONS[props.name] ?? ''"
  />
</template>
