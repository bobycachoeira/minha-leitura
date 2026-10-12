/// <reference path="../pb_data/types.d.ts" />
/**
 * T037 — hook bootstrap and route registration.
 *
 * PocketBase auto-loads top-level `pb_hooks/*.pb.js`. All handler logic lives in
 * `pb_hooks/lib/handlers/*.js` (CommonJS modules) and is required *inside* the
 * route callback, matching the controle-financeiro pattern (keeps module scope).
 *
 * NOTE: PocketBase already exposes `GET /api/health` natively — do not re-register.
 */

onBootstrap(function (e) {
  console.log(JSON.stringify({ event: 'bootstrap', tz: $os.getenv('CF_TIMEZONE') || 'America/Sao_Paulo' }))
  e.next()
})

routerAdd("POST", "/api/auth/magic-link/request", (c) => require(`${__hooks}/lib/handlers/auth.js`).requestMagicLinkHandler(c));
routerAdd("POST", "/api/auth/magic-link/verify", (c) => require(`${__hooks}/lib/handlers/auth.js`).verifyMagicLinkHandler(c));
routerAdd("POST", "/api/auth/2fa/setup", (c) => require(`${__hooks}/lib/handlers/auth.js`).setup2faHandler(c));
routerAdd("POST", "/api/auth/2fa/confirm", (c) => require(`${__hooks}/lib/handlers/auth.js`).confirm2faHandler(c));
routerAdd("POST", "/api/auth/2fa/verify", (c) => require(`${__hooks}/lib/handlers/auth.js`).verify2faHandler(c));
routerAdd("GET", "/api/auth/me", (c) => require(`${__hooks}/lib/handlers/auth.js`).meHandler(c));
routerAdd("PATCH", "/api/auth/me", (c) => require(`${__hooks}/lib/handlers/auth.js`).updateMeHandler(c));
routerAdd("POST", "/api/auth/logout", (c) => require(`${__hooks}/lib/handlers/auth.js`).h_auth_post_api_auth_logout(c));

routerAdd("GET", "/api/devices", (c) => require(`${__hooks}/lib/handlers/devices.js`).h_devices_get_api_devices(c));
routerAdd("POST", "/api/devices", (c) => require(`${__hooks}/lib/handlers/devices.js`).h_devices_post_api_devices(c));
routerAdd("DELETE", "/api/devices/{id}", (c) => require(`${__hooks}/lib/handlers/devices.js`).h_devices_delete_api_devices_id(c));

routerAdd("GET", "/api/spaces", (c) => require(`${__hooks}/lib/handlers/space.js`).h_space_get_api_spaces(c));
routerAdd("POST", "/api/spaces", (c) => require(`${__hooks}/lib/handlers/space.js`).h_space_post_api_spaces(c));
routerAdd("GET", "/api/spaces/{id}/members", (c) => require(`${__hooks}/lib/handlers/space.js`).h_space_get_api_spaces_id_members(c));
routerAdd("POST", "/api/spaces/{id}/invites", (c) => require(`${__hooks}/lib/handlers/space.js`).h_space_post_api_spaces_id_invites(c));
routerAdd("POST", "/api/invites/accept", (c) => require(`${__hooks}/lib/handlers/space.js`).h_space_post_api_invites_accept(c));
routerAdd("PATCH", "/api/spaces/{id}/members/{userId}", (c) => require(`${__hooks}/lib/handlers/space.js`).h_space_patch_api_spaces_id_members_userId(c));

routerAdd("GET", "/api/books", (c) => require(`${__hooks}/lib/handlers/reading.js`).h_reading_get_api_books(c));
routerAdd("POST", "/api/books", (c) => require(`${__hooks}/lib/handlers/reading.js`).h_reading_post_api_books(c));
routerAdd("GET", "/api/user-books", (c) => require(`${__hooks}/lib/handlers/reading.js`).h_reading_get_api_user_books(c));
routerAdd("POST", "/api/user-books", (c) => require(`${__hooks}/lib/handlers/reading.js`).h_reading_post_api_user_books(c));
routerAdd("PATCH", "/api/user-books/{id}", (c) => require(`${__hooks}/lib/handlers/reading.js`).h_reading_patch_api_user_books_id(c));
routerAdd("GET", "/api/reading-logs", (c) => require(`${__hooks}/lib/handlers/reading.js`).h_reading_get_api_reading_logs(c));
routerAdd("POST", "/api/reading-logs", (c) => require(`${__hooks}/lib/handlers/reading.js`).h_reading_post_api_reading_logs(c));
routerAdd("PATCH", "/api/reading-logs/{id}", (c) => require(`${__hooks}/lib/handlers/reading.js`).h_reading_patch_api_reading_logs_id(c));
routerAdd("DELETE", "/api/reading-logs/{id}", (c) => require(`${__hooks}/lib/handlers/reading.js`).h_reading_delete_api_reading_logs_id(c));
routerAdd("GET", "/api/dashboard", (c) => require(`${__hooks}/lib/handlers/reading.js`).h_reading_get_api_dashboard(c));
routerAdd("GET", "/api/catalog/search", (c) => require(`${__hooks}/lib/handlers/reading.js`).h_reading_get_api_catalog_search(c));
routerAdd("GET", "/api/recommendations", (c) => require(`${__hooks}/lib/handlers/reading.js`).h_reading_get_api_recommendations(c));
routerAdd("POST", "/api/recommendations/{id}/dismiss", (c) => require(`${__hooks}/lib/handlers/reading.js`).h_reading_post_api_recommendations_id_dismiss(c));
routerAdd("POST", "/api/recommendations/{id}/add", (c) => require(`${__hooks}/lib/handlers/reading.js`).h_reading_post_api_recommendations_id_add(c));

routerAdd("GET", "/api/goals", (c) => require(`${__hooks}/lib/handlers/goals.js`).h_goals_get_api_goals(c));
routerAdd("POST", "/api/goals", (c) => require(`${__hooks}/lib/handlers/goals.js`).h_goals_post_api_goals(c));
routerAdd("PATCH", "/api/goals/{id}", (c) => require(`${__hooks}/lib/handlers/goals.js`).h_goals_patch_api_goals_id(c));
routerAdd("DELETE", "/api/goals/{id}", (c) => require(`${__hooks}/lib/handlers/goals.js`).h_goals_delete_api_goals_id(c));
routerAdd("GET", "/api/goals/{id}/periods", (c) => require(`${__hooks}/lib/handlers/goals.js`).h_goals_get_api_goals_id_periods(c));
routerAdd("GET", "/api/goals/{id}/periods/current", (c) => require(`${__hooks}/lib/handlers/goals.js`).h_goals_get_api_goals_id_periods_current(c));
routerAdd("POST", "/api/goal-periods/{id}/reopen", (c) => require(`${__hooks}/lib/handlers/goals.js`).h_goals_post_api_goal_periods_id_reopen(c));
routerAdd("GET", "/api/achievements", (c) => require(`${__hooks}/lib/handlers/goals.js`).h_goals_get_api_achievements(c));

routerAdd("GET", "/api/feed", (c) => require(`${__hooks}/lib/handlers/feed.js`).h_feed_get_api_feed(c));
routerAdd("POST", "/api/posts", (c) => require(`${__hooks}/lib/handlers/feed.js`).h_feed_post_api_posts(c));
routerAdd("POST", "/api/posts/{id}/reactions", (c) => require(`${__hooks}/lib/handlers/feed.js`).h_feed_post_api_posts_id_reactions(c));
routerAdd("GET", "/api/posts/{id}/comments", (c) => require(`${__hooks}/lib/handlers/feed.js`).h_feed_get_api_posts_id_comments(c));
routerAdd("POST", "/api/posts/{id}/comments", (c) => require(`${__hooks}/lib/handlers/feed.js`).h_feed_post_api_posts_id_comments(c));
routerAdd("POST", "/api/comments/{id}/reactions", (c) => require(`${__hooks}/lib/handlers/feed.js`).h_feed_post_api_comments_id_reactions(c));
routerAdd("GET", "/api/challenges", (c) => require(`${__hooks}/lib/handlers/feed.js`).h_feed_get_api_challenges(c));
routerAdd("POST", "/api/challenges", (c) => require(`${__hooks}/lib/handlers/feed.js`).h_feed_post_api_challenges(c));

routerAdd("POST", "/api/sync/push", (c) => require(`${__hooks}/lib/handlers/sync.js`).h_sync_post_api_sync_push(c));
routerAdd("GET", "/api/sync/pull", (c) => require(`${__hooks}/lib/handlers/sync.js`).h_sync_get_api_sync_pull(c));

routerAdd("GET", "/api/notification-preferences", (c) => require(`${__hooks}/lib/handlers/notifications.js`).h_notifications_get_api_notification_preferences(c));
routerAdd("PUT", "/api/notification-preferences", (c) => require(`${__hooks}/lib/handlers/notifications.js`).h_notifications_put_api_notification_preferences(c));

// Social (opt-in): follow readers and view their public posts.
routerAdd("GET", "/api/people", (c) => require(`${__hooks}/lib/handlers/social.js`).people(c));
routerAdd("GET", "/api/following", (c) => require(`${__hooks}/lib/handlers/social.js`).following(c));
routerAdd("GET", "/api/users/{id}/profile", (c) => require(`${__hooks}/lib/handlers/social.js`).profile(c));
routerAdd("GET", "/api/users/{id}/posts", (c) => require(`${__hooks}/lib/handlers/social.js`).userPosts(c));
routerAdd("POST", "/api/users/{id}/follow", (c) => require(`${__hooks}/lib/handlers/social.js`).follow(c));
routerAdd("DELETE", "/api/users/{id}/follow", (c) => require(`${__hooks}/lib/handlers/social.js`).unfollow(c));
routerAdd("GET", "/api/notifications", (c) => require(`${__hooks}/lib/handlers/social.js`).notificationsList(c));
routerAdd("POST", "/api/notifications/read", (c) => require(`${__hooks}/lib/handlers/social.js`).notificationsRead(c));

cronAdd("close-goal-periods", "*/15 * * * *", () => require(`${__hooks}/lib/handlers/goals.js`).cron_goals());

cronAdd("close-challenges", "*/15 * * * *", () => require(`${__hooks}/lib/handlers/feed.js`).cron_feed());
