/** pt-BR formatting helpers (FR: VI — localized dates and numbers). */

export function formatDate(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(`${value}T00:00:00Z`) : value
  return new Intl.DateTimeFormat('pt-BR').format(date)
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('pt-BR').format(value)
}

export function formatPercent(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 0 }).format(
    value / 100,
  )
}

export function initialsFor(title: string, author?: string): string {
  const source = `${title} ${author ?? ''}`.trim()
  const words = source.split(/\s+/).filter(Boolean)
  const initials = words.slice(0, 2).map((word) => word.charAt(0).toUpperCase())
  return initials.join('') || '?'
}

/** "Faltam N páginas/livros" with correct singular/plural, or "Meta batida!". */
export function remainingLabel(metric: 'paginas' | 'livros', remaining: number): string {
  if (remaining <= 0) return 'Meta batida!'
  const unit = metric === 'paginas' ? (remaining === 1 ? 'página' : 'páginas') : remaining === 1 ? 'livro' : 'livros'
  return `Faltam ${remaining} ${unit}`
}

/** "N dias no período" with correct singular/plural. */
export function daysLabel(days: number): string {
  return `${days} ${days === 1 ? 'dia' : 'dias'} no período`
}

/** Formats an ISO business date as dd/mm. */
export function formatDayMonth(iso: string): string {
  const value = iso.slice(0, 10)
  return `${value.slice(8, 10)}/${value.slice(5, 7)}`
}

/** Human-friendly relative time in pt-BR ("agora", "há 5 min", "ontem"). */
export function relativeTime(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value.replace(' ', 'T')) : value
  if (Number.isNaN(date.getTime())) return ''
  const diff = Date.now() - date.getTime()
  const min = Math.round(diff / 60000)
  if (min < 1) return 'agora'
  if (min < 60) return `há ${min} min`
  const hours = Math.round(min / 60)
  if (hours < 24) return `há ${hours} h`
  const days = Math.round(hours / 24)
  if (days === 1) return 'ontem'
  if (days < 7) return `há ${days} dias`
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(date)
}

