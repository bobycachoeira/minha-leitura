import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import BookCover from '../../src/features/library/BookCover.vue'
import { db } from '../../src/db/schema.js'
import { putCachedCover } from '../../src/db/cover-cache.js'
import { COVER_CACHE_MAX_ITEMS } from '@ml/shared'

describe('BookCover placeholder (FR-033)', () => {
  it('renders deterministic initials when there is no cover', () => {
    const wrapper = mount(BookCover, {
      props: { bookId: 'b1', title: 'Dom Casmurro', author: 'Machado de Assis' },
    })
    const placeholder = wrapper.get('[data-testid="cover-placeholder"]')
    expect(placeholder.text()).toBe('DC')
  })

  it('produces the same color for the same title', () => {
    const first = mount(BookCover, { props: { bookId: 'b1', title: 'Grande Sertão' } })
    const second = mount(BookCover, { props: { bookId: 'b2', title: 'Grande Sertão' } })
    const styleA = first.get('[data-testid="cover-placeholder"]').attributes('style')
    const styleB = second.get('[data-testid="cover-placeholder"]').attributes('style')
    expect(styleA).toBe(styleB)
  })
})

describe('cover cache LRU cap (FR-037)', () => {
  it('never stores more than the configured maximum', async () => {
    await db.coverCache.clear()
    for (let i = 0; i < COVER_CACHE_MAX_ITEMS + 10; i++) {
      await putCachedCover(`book-${i}`, new Blob([new Uint8Array(16)]))
    }
    const count = await db.coverCache.count()
    expect(count).toBeLessThanOrEqual(COVER_CACHE_MAX_ITEMS)
  })
})
