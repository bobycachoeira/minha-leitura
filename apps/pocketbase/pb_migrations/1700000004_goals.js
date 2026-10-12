/// <reference path="../pb_data/types.d.ts" />
/**
 * T033 — goal collections: goals, goal_periods, achievements.
 */
migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    const spaces = app.findCollectionByNameOrId('spaces')

    const goals = new Collection({
      type: 'base',
      name: 'goals',
      fields: [
        { name: 'space', type: 'relation', required: true, maxSelect: 1, collectionId: spaces.id, cascadeDelete: true },
        { name: 'owner', type: 'relation', required: true, maxSelect: 1, collectionId: users.id, cascadeDelete: true },
        { name: 'metric', type: 'select', required: true, maxSelect: 1, values: ['paginas', 'livros'] },
        { name: 'period', type: 'select', required: true, maxSelect: 1, values: ['dia', 'semana', 'mes'] },
        { name: 'target', type: 'number', required: true, min: 1, onlyInt: true },
        { name: 'week_start', type: 'number', min: 0, max: 6, onlyInt: true },
        { name: 'grace_hours', type: 'number', min: 0, onlyInt: true },
        { name: 'active', type: 'bool' },
        { name: 'starts_on', type: 'date', required: true },
        { name: 'sync_id', type: 'text', required: true },
        { name: 'updated_by', type: 'relation', maxSelect: 1, collectionId: users.id },
        { name: 'deleted_at', type: 'date' },
      ],
      indexes: ['CREATE INDEX idx_goals_owner ON goals (owner)'],
    })
    app.save(goals)

    const goalPeriods = new Collection({
      type: 'base',
      name: 'goal_periods',
      fields: [
        { name: 'space', type: 'relation', required: true, maxSelect: 1, collectionId: spaces.id, cascadeDelete: true },
        { name: 'owner', type: 'relation', required: true, maxSelect: 1, collectionId: users.id, cascadeDelete: true },
        { name: 'goal', type: 'relation', required: true, maxSelect: 1, collectionId: goals.id, cascadeDelete: true },
        { name: 'start_date', type: 'date', required: true },
        { name: 'end_date', type: 'date', required: true },
        { name: 'target', type: 'number', required: true, min: 1, onlyInt: true },
        { name: 'progress', type: 'number', min: 0, onlyInt: true },
        { name: 'status', type: 'select', required: true, maxSelect: 1, values: ['aberto', 'batida', 'nao_batida'] },
        { name: 'grace_until', type: 'date', required: true },
        { name: 'closed_at', type: 'date' },
        { name: 'reopened_at', type: 'date' },
        { name: 'sync_id', type: 'text', required: true },
        { name: 'updated_by', type: 'relation', maxSelect: 1, collectionId: users.id },
        { name: 'deleted_at', type: 'date' },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_goal_period ON goal_periods (goal, start_date, end_date)'],
    })
    app.save(goalPeriods)

    const achievements = new Collection({
      type: 'base',
      name: 'achievements',
      fields: [
        { name: 'space', type: 'relation', required: true, maxSelect: 1, collectionId: spaces.id, cascadeDelete: true },
        { name: 'owner', type: 'relation', required: true, maxSelect: 1, collectionId: users.id, cascadeDelete: true },
        { name: 'goal_period', type: 'relation', required: true, maxSelect: 1, collectionId: goalPeriods.id, cascadeDelete: true },
        { name: 'kind', type: 'select', required: true, maxSelect: 1, values: ['meta_batida', 'meta_nao_batida'] },
        { name: 'payload', type: 'json', maxSize: 200000 },
        { name: 'card_theme', type: 'text' },
        { name: 'sync_id', type: 'text', required: true },
        { name: 'updated_by', type: 'relation', maxSelect: 1, collectionId: users.id },
        { name: 'deleted_at', type: 'date' },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_achievement_period ON achievements (goal_period)'],
    })
    app.save(achievements)
  },
  (app) => {
    app.delete(app.findCollectionByNameOrId('achievements'))
    app.delete(app.findCollectionByNameOrId('goal_periods'))
    app.delete(app.findCollectionByNameOrId('goals'))
  },
)
