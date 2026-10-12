/// <reference path="../pb_data/types.d.ts" />
/**
 * T032 — library collections: books, user_books, reading_logs.
 */
migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    const spaces = app.findCollectionByNameOrId('spaces')

    const books = new Collection({
      type: 'base',
      name: 'books',
      fields: [
        { name: 'space', type: 'relation', required: true, maxSelect: 1, collectionId: spaces.id, cascadeDelete: true },
        { name: 'title', type: 'text', required: true, max: 300 },
        { name: 'authors', type: 'json', maxSize: 200000 },
        { name: 'isbn', type: 'text' },
        { name: 'cover_url', type: 'url' },
        { name: 'total_pages', type: 'number', min: 1, onlyInt: true },
        { name: 'genres', type: 'json', maxSize: 200000 },
        { name: 'source', type: 'select', required: true, maxSelect: 1, values: ['manual', 'open_library', 'google_books'] },
        { name: 'external_id', type: 'text' },
        { name: 'created_by', type: 'relation', maxSelect: 1, collectionId: users.id },
        { name: 'sync_id', type: 'text', required: true },
        { name: 'updated_by', type: 'relation', maxSelect: 1, collectionId: users.id },
        { name: 'deleted_at', type: 'date' },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_books_external ON books (space, source, external_id) WHERE external_id != ""',
        'CREATE INDEX idx_books_space ON books (space)',
      ],
    })
    app.save(books)

    const userBooks = new Collection({
      type: 'base',
      name: 'user_books',
      fields: [
        { name: 'space', type: 'relation', required: true, maxSelect: 1, collectionId: spaces.id, cascadeDelete: true },
        { name: 'owner', type: 'relation', required: true, maxSelect: 1, collectionId: users.id, cascadeDelete: true },
        { name: 'book', type: 'relation', required: true, maxSelect: 1, collectionId: books.id, cascadeDelete: true },
        { name: 'status', type: 'select', required: true, maxSelect: 1, values: ['quero_ler', 'lendo', 'lido', 'abandonado'] },
        { name: 'current_page', type: 'number', min: 0, onlyInt: true },
        { name: 'rating', type: 'number', min: 0, max: 5 },
        { name: 'notes', type: 'text', max: 5000 },
        { name: 'favorite', type: 'bool' },
        { name: 'started_at', type: 'date' },
        { name: 'finished_at', type: 'date' },
        { name: 'sync_id', type: 'text', required: true },
        { name: 'updated_by', type: 'relation', maxSelect: 1, collectionId: users.id },
        { name: 'deleted_at', type: 'date' },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_user_books_owner_book ON user_books (owner, book)'],
    })
    app.save(userBooks)

    const readingLogs = new Collection({
      type: 'base',
      name: 'reading_logs',
      fields: [
        { name: 'space', type: 'relation', required: true, maxSelect: 1, collectionId: spaces.id, cascadeDelete: true },
        { name: 'owner', type: 'relation', required: true, maxSelect: 1, collectionId: users.id, cascadeDelete: true },
        { name: 'book', type: 'relation', required: true, maxSelect: 1, collectionId: books.id, cascadeDelete: true },
        { name: 'date', type: 'date', required: true },
        { name: 'pages', type: 'number', required: true, min: 1, onlyInt: true },
        { name: 'start_page', type: 'number', min: 0, onlyInt: true },
        { name: 'end_page', type: 'number', min: 0, onlyInt: true },
        { name: 'note', type: 'text', max: 2000 },
        { name: 'sync_id', type: 'text', required: true },
        { name: 'updated_by', type: 'relation', maxSelect: 1, collectionId: users.id },
        { name: 'deleted_at', type: 'date' },
      ],
      indexes: [
        'CREATE INDEX idx_logs_space_date ON reading_logs (space, date)',
        'CREATE INDEX idx_logs_owner_book ON reading_logs (owner, book)',
      ],
    })
    app.save(readingLogs)
  },
  (app) => {
    app.delete(app.findCollectionByNameOrId('reading_logs'))
    app.delete(app.findCollectionByNameOrId('user_books'))
    app.delete(app.findCollectionByNameOrId('books'))
  },
)
