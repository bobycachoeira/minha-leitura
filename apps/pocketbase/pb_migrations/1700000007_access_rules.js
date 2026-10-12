/// <reference path="../pb_data/types.d.ts" />
/**
 * T036 — access rules: authentication required and mandatory `space` isolation.
 *
 * Every multi-tenant collection is filtered by `space_id` derived from the
 * session (never from the client payload). Business rules and RBAC are enforced
 * again in hooks (Constitution I).
 */
migrate(
  (app) => {
    const AUTH = '@request.auth.id != ""'
    const SPACE = `${AUTH} && space.space_members_via_space.user ?= @request.auth.id`
    const EDIT_ROLE =
      '@request.auth.id != "" && space.space_members_via_space.role ?!= "viewer"'

    // Reference collections need their space visible for the back-relation check.
    const setRules = (name, rules) => {
      const c = app.findCollectionByNameOrId(name)
      if (rules.list !== undefined) c.listRule = rules.list
      if (rules.view !== undefined) c.viewRule = rules.view
      if (rules.create !== undefined) c.createRule = rules.create
      if (rules.update !== undefined) c.updateRule = rules.update
      if (rules.remove !== undefined) c.deleteRule = rules.remove
      app.save(c)
    }

    // spaces: members can read; only the creator can update/remove.
    setRules('spaces', {
      list: AUTH,
      view: AUTH,
      create: AUTH,
      update: `${AUTH} && created_by = @request.auth.id`,
      remove: `${AUTH} && created_by = @request.auth.id`,
    })
    setRules('space_members', { list: AUTH, view: AUTH, create: null, update: null, remove: null })
    setRules('invites', { list: AUTH, view: AUTH, create: null, update: null, remove: null })

    for (const name of [
      'books',
      'user_books',
      'reading_logs',
      'goals',
      'goal_periods',
      'achievements',
      'posts',
      'comments',
      'challenges',
      'challenges_participants',
      'recommendations',
      'notification_preferences',
      'audit_logs',
    ]) {
      setRules(name, { list: SPACE, view: SPACE, create: EDIT_ROLE, update: EDIT_ROLE, remove: EDIT_ROLE })
    }

    // Reactions are personal and require an editing role.
    setRules('reactions', { list: SPACE, view: SPACE, create: EDIT_ROLE, update: EDIT_ROLE, remove: EDIT_ROLE })

    // Infra: client never writes directly; hooks use the admin context.
    setRules('sync_events', { list: null, view: null, create: null, update: null, remove: null })
  },
  () => {},
)
