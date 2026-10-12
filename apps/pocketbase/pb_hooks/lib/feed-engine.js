/// <reference path="../../pb_data/types.d.ts" />
/**
 * Feed materialization — turns domain facts (book finished, goal hit) into
 * `posts` so the couple feed shows activity (FR-023). De-duplicates by ref.
 */

function createPost(app, entry) {
  try {
    if (entry.refBook) {
      const existing = app.findFirstRecordByFilter(
        'posts',
        'space = {:space} && ref_book = {:book} && kind = {:kind}',
        { space: entry.space, book: entry.refBook, kind: entry.kind },
      )
      if (existing) return existing
    }
    if (entry.refAchievement) {
      const existing = app.findFirstRecordByFilter('posts', 'space = {:space} && ref_achievement = {:a}', {
        space: entry.space,
        a: entry.refAchievement,
      })
      if (existing) return existing
    }
  } catch (err) {
    // not found → create below
  }

  const collection = app.findCollectionByNameOrId('posts')
  const record = new Record(collection)
  record.set('space', entry.space)
  record.set('actor', entry.actor)
  record.set('kind', entry.kind)
  if (entry.refBook) record.set('ref_book', entry.refBook)
  if (entry.refAchievement) record.set('ref_achievement', entry.refAchievement)
  record.set('summary', entry.summary || '')
  record.set('sync_id', $security.randomString(15))
  app.save(record)
  return record
}

function bookTitle(app, bookId) {
  try {
    return app.findRecordById('books', bookId).getString('title')
  } catch (err) {
    return 'um livro'
  }
}

module.exports = { createPost: createPost, bookTitle: bookTitle }
