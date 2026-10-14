/// <reference path="../pb_data/types.d.ts" />
/** Compartilhar constância (dias seguidos lendo) no mural. */
migrate(
  (app) => {
    const posts = app.findCollectionByNameOrId('posts')
    posts.fields.removeByName('kind')
    posts.fields.add(
      new Field({
        name: 'kind',
        type: 'select',
        required: true,
        maxSelect: 1,
        values: ['livro_concluido', 'meta_batida', 'avanco', 'desafio', 'manual', 'streak'],
      }),
    )
    app.save(posts)
  },
  (app) => {
    try {
      const posts = app.findCollectionByNameOrId('posts')
      posts.fields.removeByName('kind')
      posts.fields.add(
        new Field({
          name: 'kind',
          type: 'select',
          required: true,
          maxSelect: 1,
          values: ['livro_concluido', 'meta_batida', 'avanco', 'desafio', 'manual'],
        }),
      )
      app.save(posts)
    } catch (e) {
      /* ignore */
    }
  },
)
