import { computed, ref } from 'vue'

export type CardThemeId = 'vinho' | 'petroleo' | 'escuro' | 'claro'

export interface CardTheme {
  id: CardThemeId
  label: string
  swatch: string
  canvas: {
    bg0: string
    bg1: string
    bg2: string
    text: string
    muted: string
    frame: string
    bar: string
    barTrack: string
    barDefeated: string
  }
  ui: {
    surface: string
    border: string
    headerBg: string
    headerText: string
    num: string
    sub: string
    bar: string
    barTrack: string
  }
}

const KEY = 'ml.card.theme'

export const CARD_THEMES: CardTheme[] = [
  {
    id: 'vinho',
    label: 'Vinho',
    swatch: '#7A2E2E',
    canvas: {
      bg0: '#7A2E2E',
      bg1: '#4a1f1c',
      bg2: '#241412',
      text: '#ffffff',
      muted: 'rgba(255,255,255,0.8)',
      frame: 'rgba(255,255,255,0.28)',
      bar: '#ffffff',
      barTrack: 'rgba(255,255,255,0.2)',
      barDefeated: '#c98a2b',
    },
    ui: {
      surface: '#F0E7D6',
      border: '#D8CBB6',
      headerBg: '#7A2E2E',
      headerText: '#ffffff',
      num: '#7A2E2E',
      sub: '#4A3F35',
      bar: '#7A2E2E',
      barTrack: '#E1D6C2',
    },
  },
  {
    id: 'petroleo',
    label: 'Petróleo',
    swatch: '#2F6068',
    canvas: {
      bg0: '#2F6068',
      bg1: '#1d3d43',
      bg2: '#0f2529',
      text: '#f2fffd',
      muted: 'rgba(255,255,255,0.8)',
      frame: 'rgba(255,255,255,0.28)',
      bar: '#bff0e6',
      barTrack: 'rgba(255,255,255,0.2)',
      barDefeated: '#e0b25a',
    },
    ui: {
      surface: '#e7f1f0',
      border: '#bcd6d3',
      headerBg: '#2F6068',
      headerText: '#ffffff',
      num: '#2F6068',
      sub: '#3d5f63',
      bar: '#2F6068',
      barTrack: '#cfe3e0',
    },
  },
  {
    id: 'escuro',
    label: 'Escuro',
    swatch: '#1c1a18',
    canvas: {
      bg0: '#33302c',
      bg1: '#1c1a18',
      bg2: '#0c0b0a',
      text: '#f4efe6',
      muted: 'rgba(255,255,255,0.72)',
      frame: 'rgba(255,255,255,0.2)',
      bar: '#c98a2b',
      barTrack: 'rgba(255,255,255,0.18)',
      barDefeated: '#c98a2b',
    },
    ui: {
      surface: '#2a2724',
      border: '#413c37',
      headerBg: '#1c1a18',
      headerText: '#f4efe6',
      num: '#f4efe6',
      sub: '#c9c2b6',
      bar: '#c98a2b',
      barTrack: '#3a352f',
    },
  },
  {
    id: 'claro',
    label: 'Claro',
    swatch: '#F3E9D6',
    canvas: {
      bg0: '#FBF7EF',
      bg1: '#F0E7D6',
      bg2: '#E3D7C0',
      text: '#241C15',
      muted: 'rgba(36,28,21,0.7)',
      frame: 'rgba(36,28,21,0.25)',
      bar: '#7A2E2E',
      barTrack: 'rgba(36,28,21,0.15)',
      barDefeated: '#A76F1B',
    },
    ui: {
      surface: '#FBF7EF',
      border: '#E0D4BE',
      headerBg: '#7A2E2E',
      headerText: '#ffffff',
      num: '#7A2E2E',
      sub: '#4A3F35',
      bar: '#7A2E2E',
      barTrack: '#E7DBC6',
    },
  },
]

function load(): CardThemeId {
  const stored = localStorage.getItem(KEY)
  return (CARD_THEMES.find((t) => t.id === stored)?.id ?? 'vinho') as CardThemeId
}

const current = ref<CardThemeId>(load())

export function getCardTheme(id?: CardThemeId): CardTheme {
  return CARD_THEMES.find((t) => t.id === (id ?? current.value)) ?? CARD_THEMES[0]!
}

/** Persisted card theme shared across the app. */
export function useCardTheme() {
  function setTheme(id: CardThemeId): void {
    current.value = id
    localStorage.setItem(KEY, id)
  }
  return {
    themeId: current,
    themes: CARD_THEMES,
    setTheme,
    theme: computed(() => getCardTheme()),
  }
}
