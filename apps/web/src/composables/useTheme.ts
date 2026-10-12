import { ref } from 'vue'

export type Theme = 'light' | 'dark'
export type Accent = 'vinho' | 'petroleo' | 'musgo' | 'ouro'

export interface AccentOption {
  id: Accent
  label: string
  swatch: string
}

const THEME_KEY = 'ml.theme'
const ACCENT_KEY = 'ml.accent'

export const ACCENTS: AccentOption[] = [
  { id: 'vinho', label: 'Vinho', swatch: '#7A2E2E' },
  { id: 'petroleo', label: 'Petróleo', swatch: '#2D5D64' },
  { id: 'musgo', label: 'Musgo', swatch: '#546446' },
  { id: 'ouro', label: 'Ouro', swatch: '#96601E' },
]

function applyTheme(theme: Theme): void {
  document.documentElement.setAttribute('data-theme', theme)
}

function applyAccent(accent: Accent): void {
  document.documentElement.setAttribute('data-accent', accent)
}

function initialTheme(): Theme {
  const stored = localStorage.getItem(THEME_KEY)
  if (stored === 'light' || stored === 'dark') return stored
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function initialAccent(): Accent {
  const stored = localStorage.getItem(ACCENT_KEY)
  return (ACCENTS.find((a) => a.id === stored)?.id ?? 'vinho') as Accent
}

/** Light/dark theme + accent palette, both persisted. */
export function useTheme() {
  const theme = ref<Theme>(initialTheme())
  const accent = ref<Accent>(initialAccent())
  applyTheme(theme.value)
  applyAccent(accent.value)

  function toggle(): void {
    theme.value = theme.value === 'light' ? 'dark' : 'light'
    localStorage.setItem(THEME_KEY, theme.value)
    applyTheme(theme.value)
  }

  function setAccent(next: Accent): void {
    accent.value = next
    localStorage.setItem(ACCENT_KEY, next)
    applyAccent(next)
  }

  return { theme, accent, toggle, setAccent, accents: ACCENTS }
}
