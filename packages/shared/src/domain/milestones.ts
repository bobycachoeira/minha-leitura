/** Milestone (badge) catalog shared by the server (unlock) and the client (display). */

export interface MilestoneDef {
  key: string
  label: string
  hint: string
  kind: 'books' | 'pages' | 'streak'
  threshold: number
  icon: string
}

export const MILESTONES: MilestoneDef[] = [
  { key: 'books_1', label: 'Primeiro livro', hint: 'Termine 1 livro', kind: 'books', threshold: 1, icon: 'books' },
  { key: 'books_5', label: '5 livros', hint: 'Termine 5 livros', kind: 'books', threshold: 5, icon: 'books' },
  { key: 'books_10', label: '10 livros', hint: 'Termine 10 livros', kind: 'books', threshold: 10, icon: 'books' },
  { key: 'books_25', label: '25 livros', hint: 'Termine 25 livros', kind: 'books', threshold: 25, icon: 'books' },
  { key: 'books_50', label: '50 livros', hint: 'Termine 50 livros', kind: 'books', threshold: 50, icon: 'books' },
  { key: 'pages_1000', label: '1.000 páginas', hint: 'Leia 1.000 páginas', kind: 'pages', threshold: 1000, icon: 'sparkles' },
  { key: 'pages_5000', label: '5.000 páginas', hint: 'Leia 5.000 páginas', kind: 'pages', threshold: 5000, icon: 'sparkles' },
  { key: 'streak_7', label: '7 seguidos', hint: '7 períodos batidos em sequência', kind: 'streak', threshold: 7, icon: 'award' },
  { key: 'streak_30', label: '30 seguidos', hint: '30 períodos batidos em sequência', kind: 'streak', threshold: 30, icon: 'award' },
  { key: 'streak_100', label: '100 seguidos', hint: '100 períodos batidos em sequência', kind: 'streak', threshold: 100, icon: 'award' },
]

export function milestoneByKey(key: string): MilestoneDef | undefined {
  return MILESTONES.find((m) => m.key === key)
}
