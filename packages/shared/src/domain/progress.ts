import type { ReadStatus } from '../constants/index.js'

export interface ProgressLogLike {
  pages?: number
  endPage?: number | null
  deletedAt?: string | null
}

export interface UserBookProgressInput {
  status: ReadStatus
  currentPage: number
  totalPages?: number | null
}

export interface ProgressResult {
  currentPage: number
  remaining: number | null
  percent: number
  status: ReadStatus
}

/**
 * Derives the current page, remaining pages, percent and the status transition
 * from the user book state plus its page logs (FR-010, FR-011).
 */
export function computeProgress(
  userBook: UserBookProgressInput,
  logs: ProgressLogLike[] = [],
): ProgressResult {
  const maxEndPage = logs
    .filter((log) => !log.deletedAt && typeof log.endPage === 'number')
    .reduce((max, log) => Math.max(max, log.endPage as number), 0)

  const totalPages = typeof userBook.totalPages === 'number' ? userBook.totalPages : null
  let currentPage = Math.max(userBook.currentPage, maxEndPage)
  if (totalPages !== null) currentPage = Math.min(currentPage, totalPages)

  const remaining = totalPages === null ? null : Math.max(0, totalPages - currentPage)
  const percent = totalPages && totalPages > 0 ? Math.round((currentPage / totalPages) * 100) : 0

  const status: ReadStatus =
    totalPages !== null && currentPage >= totalPages ? 'lido' : userBook.status

  return { currentPage, remaining, percent, status }
}
