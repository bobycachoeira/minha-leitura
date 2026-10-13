/// <reference path="../../pb_data/types.d.ts" />
/**
 * US6/US8 — social feed (posts, reactions, comments) and couple challenges.
 */

var http = require(__hooks + '/lib/http.js')
var auth = require(__hooks + '/lib/auth.js')
var changelog = require(__hooks + '/lib/changelog.js')
var audit = require(__hooks + '/lib/audit.js')
var engine = require(__hooks + '/lib/goals-engine.js')
var social = require(__hooks + '/lib/handlers/social.js')

function body(c) {
  return http.requestBody(c) || {}
}

function enrich(app, rec, userId) {
  var item = rec.publicExport()
  item.authorId = rec.getString('actor')
  item.authorName = social.userName(rec.getString('actor'))
  item.authorAvatar = social.userAvatar(rec.getString('actor'))
  item.visibility = rec.getString('visibility') === 'public' ? 'public' : 'space'
  var reactions = app.findRecordsByFilter('reactions', 'post = {:post} && deleted_at = null', '', 0, 0, {
    post: rec.id,
  })
  var comments = app.findRecordsByFilter('comments', 'post = {:post} && deleted_at = null', 'created', 0, 0, {
    post: rec.id,
  })
  item.reactionsCount = reactions.length
  item.commentsCount = comments.length
  var refAchievement = rec.getString('ref_achievement')
  if (refAchievement) {
    try {
      var ach = app.findRecordById('achievements', refAchievement)
      item.achievement = { kind: ach.getString('kind'), payload: ach.get('payload') }
    } catch (e) {
      item.achievement = null
    }
  }
  item.liked = false
  if (userId) {
    try {
      app.findFirstRecordByFilter(
        'reactions',
        'post = {:post} && user = {:user} && kind = "curtir" && deleted_at = null',
        { post: rec.id, user: userId },
      )
      item.liked = true
    } catch (e) {
      item.liked = false
    }
  }
  return item
}

function h_feed_get_api_feed(c) {
  var spaceId = http.queryParam(c, 'space')
  var ctx = auth.requireSpace($app, c, spaceId)
  if (!ctx) return

  var out = []
  var seen = {}

  // 1) The space feed (all visibilities).
  var posts = $app.findRecordsByFilter('posts', 'space = {:space} && deleted_at = null', '-created', 50, 0, {
    space: spaceId,
  })
  for (var i = 0; i < posts.length; i++) {
    out.push(enrich($app, posts[i], ctx.userId))
    seen[posts[i].id] = true
  }

  // 2) Public posts from people you follow (cross-space, opt-in only).
  var follows = $app.findRecordsByFilter('follows', 'follower = {:f}', '-created', 100, 0, { f: ctx.userId })
  for (var f = 0; f < follows.length; f++) {
    var targetId = follows[f].getString('following')
    var publicPosts = social.publicPostsOf(targetId)
    for (var p = 0; p < publicPosts.length; p++) {
      if (seen[publicPosts[p].id]) continue
      var rec = null
      try {
        rec = $app.findRecordById('posts', publicPosts[p].id)
      } catch (e) {
        rec = null
      }
      if (rec) {
        out.push(enrich($app, rec, ctx.userId))
        seen[rec.id] = true
      }
    }
  }

  // 3) Recent activity about you (likes/comments/follows) as feed items.
  var notifs = $app.findRecordsByFilter('notifications', 'user = {:u} && kind != "test"', '-created', 15, 0, { u: ctx.userId })
  for (var k = 0; k < notifs.length; k++) {
    var n = notifs[k]
    var actorId = n.getString('actor')
    out.push({
      id: 'notif-' + n.id,
      type: 'notification',
      notifKind: n.getString('kind'),
      actorId: actorId,
      authorId: actorId,
      authorName: social.userName(actorId),
      authorAvatar: social.userAvatar(actorId),
      body: n.getString('body'),
      created: n.getString('created'),
      visibility: 'space',
      reactionsCount: 0,
      commentsCount: 0,
      liked: false,
    })
  }

  out.sort(function (a, b) {
    return a.created < b.created ? 1 : a.created > b.created ? -1 : 0
  })
  return http.ok(c, out.slice(0, 60))
}

function h_feed_post_api_posts(c) {
  var spaceId = http.queryParam(c, 'space')
  var ctx = auth.requireRole($app, c, spaceId, ['owner', 'partner'])
  if (!ctx) return
  var data = body(c)
  var collection = $app.findCollectionByNameOrId('posts')
  var record = new Record(collection)
  record.set('space', spaceId)
  record.set('actor', ctx.userId)
  record.set('kind', data.kind || 'manual')
  record.set('summary', data.summary || '')
  record.set('visibility', data.visibility === 'public' ? 'public' : 'space')
  if (data.refBook) record.set('ref_book', data.refBook)
  if (data.refAchievement) record.set('ref_achievement', data.refAchievement)
  record.set('sync_id', data.syncId || engine.uid())
  $app.save(record)
  changelog.writeChange($app, { space: spaceId, entity: 'posts', entityId: record.id, op: 'upsert', updatedAt: new Date().toISOString() })
  // Notify followers about a new public post (opt-in social).
  if (record.getString('visibility') === 'public') {
    var followers = $app.findRecordsByFilter('follows', 'following = {:t}', '', 0, 0, { t: ctx.userId })
    for (var f = 0; f < followers.length; f++) {
      social.notify(followers[f].getString('follower'), ctx.userId, 'post', { post: record.id })
    }
  }
  return http.ok(c, enrich($app, record, ctx.userId), 201)
}

/**
 * Resolves whether the current user may read/interact with a post. Members of the
 * post's space can; other users can only on PUBLIC posts they follow (opt-in).
 * Returns { userId, spaceId, post } when allowed, or null after writing a response.
 */
function resolvePostAccess(c) {
  var userId = auth.requireAuth(c)
  if (!userId) return null
  var post = null
  try {
    post = $app.findRecordById('posts', http.pathParam(c, 'id'))
  } catch (err) {
    http.fail(c, 404, 'not_found', 'publicação não encontrada')
    return null
  }
  var spaceId = post.getString('space')
  if (auth.requireSpaceForUser($app, spaceId, userId)) {
    return { userId: userId, spaceId: spaceId, post: post }
  }
  if (post.getString('visibility') === 'public' && social.isFollowing(userId, post.getString('actor'))) {
    return { userId: userId, spaceId: spaceId, post: post }
  }
  http.fail(c, 403, 'forbidden', 'acesso negado a esta publicação')
  return null
}

function h_feed_post_api_posts_id_reactions(c) {
  var access = resolvePostAccess(c)
  if (!access) return
  var data = body(c)
  var kind = data.kind || 'curtir'
  var postId = http.pathParam(c, 'id')
  var existing = null
  try {
    existing = $app.findFirstRecordByFilter(
      'reactions',
      'post = {:post} && user = {:user} && kind = {:kind}',
      { post: postId, user: access.userId, kind: kind },
    )
  } catch (e) {
    existing = null
  }
  if (existing) {
    var wasDeleted = existing.getString('deleted_at') !== ''
    existing.set('deleted_at', wasDeleted ? '' : new Date().toISOString())
    $app.save(existing)
    return http.ok(c, { toggled: true, liked: wasDeleted })
  }
  var collection = $app.findCollectionByNameOrId('reactions')
  var record = new Record(collection)
  record.set('space', access.spaceId)
  record.set('post', postId)
  record.set('user', access.userId)
  record.set('kind', kind)
  record.set('sync_id', engine.uid())
  $app.save(record)
  social.notify(access.post.getString('actor'), access.userId, 'like', { post: postId })
  return http.ok(c, record.publicExport(), 201)
}

function h_feed_get_api_posts_id_comments(c) {
  var access = resolvePostAccess(c)
  if (!access) return
  var records = $app.findRecordsByFilter('comments', 'post = {:post} && deleted_at = null', 'created', 0, 0, {
    post: http.pathParam(c, 'id'),
  })
  return http.ok(c, records.map(function (r) {
    var item = r.publicExport()
    item.authorName = social.userName(r.getString('author'))
    item.authorAvatar = social.userAvatar(r.getString('author'))
    var likes = $app.findRecordsByFilter('comment_reactions', 'comment = {:c} && deleted_at = null', '', 0, 0, {
      c: r.id,
    })
    item.likesCount = likes.length
    item.liked = false
    for (var k = 0; k < likes.length; k++) {
      if (likes[k].getString('user') === access.userId) item.liked = true
    }
    return item
  }))
}

/** Resolves access to a comment via its post (member or public + following). */
function resolveCommentAccess(c) {
  var userId = auth.requireAuth(c)
  if (!userId) return null
  var comment = null
  try {
    comment = $app.findRecordById('comments', http.pathParam(c, 'id'))
  } catch (err) {
    http.fail(c, 404, 'not_found', 'comentário não encontrado')
    return null
  }
  var post = null
  try {
    post = $app.findRecordById('posts', comment.getString('post'))
  } catch (err) {
    http.fail(c, 404, 'not_found', 'publicação não encontrada')
    return null
  }
  var spaceId = post.getString('space')
  if (auth.requireSpaceForUser($app, spaceId, userId)) return { userId: userId, spaceId: spaceId, comment: comment, post: post }
  if (post.getString('visibility') === 'public' && social.isFollowing(userId, post.getString('actor'))) {
    return { userId: userId, spaceId: spaceId, comment: comment, post: post }
  }
  http.fail(c, 403, 'forbidden', 'acesso negado')
  return null
}

function h_feed_post_api_comments_id_reactions(c) {
  var access = resolveCommentAccess(c)
  if (!access) return
  var commentId = access.comment.id
  var existing = null
  try {
    existing = $app.findFirstRecordByFilter('comment_reactions', 'comment = {:c} && user = {:u}', {
      c: commentId,
      u: access.userId,
    })
  } catch (e) {
    existing = null
  }
  if (existing) {
    var wasDeleted = existing.getString('deleted_at') !== ''
    existing.set('deleted_at', wasDeleted ? '' : new Date().toISOString())
    $app.save(existing)
    return http.ok(c, { toggled: true, liked: wasDeleted })
  }
  var collection = $app.findCollectionByNameOrId('comment_reactions')
  var record = new Record(collection)
  record.set('space', access.spaceId)
  record.set('comment', commentId)
  record.set('user', access.userId)
  record.set('kind', 'curtir')
  record.set('sync_id', engine.uid())
  $app.save(record)
  social.notify(access.comment.getString('author'), access.userId, 'like', {
    post: access.comment.getString('post'),
    comment: commentId,
  })
  return http.ok(c, { liked: true }, 201)
}

function h_feed_post_api_posts_id_comments(c) {
  var access = resolvePostAccess(c)
  if (!access) return
  var data = body(c)
  if (!data.body || data.body.length < 1 || data.body.length > 1000) {
    return http.fail(c, 422, 'invalid_comment', 'comentário deve ter 1–1000 caracteres')
  }
  var collection = $app.findCollectionByNameOrId('comments')
  var record = new Record(collection)
  record.set('space', access.spaceId)
  record.set('post', http.pathParam(c, 'id'))
  record.set('author', access.userId)
  record.set('body', data.body)
  if (data.parent) record.set('parent', data.parent)
  record.set('sync_id', engine.uid())
  $app.save(record)
  social.notify(access.post.getString('actor'), access.userId, 'comment', {
    post: http.pathParam(c, 'id'),
    comment: record.id,
    body: data.body,
  })
  var out = record.publicExport()
  out.authorName = social.userName(access.userId)
  out.authorAvatar = social.userAvatar(access.userId)
  out.liked = false
  out.likesCount = 0
  return http.ok(c, out, 201)
}

// ------------------------------------------------------------- challenges

/** Summed space progress for a challenge within its window (US8/AC2). */
function sumChallengeProgress(challenge) {
  var spaceId = challenge.getString('space')
  var start = String(challenge.get('start_date')).slice(0, 10)
  var end = String(challenge.get('end_date')).slice(0, 10)
  if (challenge.getString('metric') === 'paginas') {
    var logs = $app.findRecordsByFilter('reading_logs', 'space = {:space} && deleted_at = null', '', 0, 0, {
      space: spaceId,
    })
    var pages = 0
    for (var i = 0; i < logs.length; i++) {
      var day = String(logs[i].get('date')).slice(0, 10)
      if (day >= start && day <= end) pages += logs[i].get('pages') || 0
    }
    return pages
  }
  var books = $app.findRecordsByFilter('user_books', 'space = {:space} && deleted_at = null', '', 0, 0, {
    space: spaceId,
  })
  var count = 0
  for (var b = 0; b < books.length; b++) {
    var finished = books[b].get('finished_at')
    var day = finished ? String(finished).slice(0, 10) : null
    if (books[b].getString('status') === 'lido' && day && day >= start && day <= end) count += 1
  }
  return count
}

function challengeStatus(challenge, progress) {
  var current = challenge.getString('status')
  if (current !== 'aberto') return current
  if (progress >= challenge.get('target')) return 'batida'
  var end = String(challenge.get('end_date')).slice(0, 10)
  var grace = challenge.get('grace_hours') || 24
  var graceUntil = new Date(end + 'T23:59:59.000Z').getTime() + grace * 3600000
  return Date.now() > graceUntil ? 'nao_batida' : 'aberto'
}

function h_feed_get_api_challenges(c) {
  var spaceId = http.queryParam(c, 'space')
  var ctx = auth.requireSpace($app, c, spaceId)
  if (!ctx) return
  var records = $app.findRecordsByFilter('challenges', 'space = {:space} && deleted_at = null', '-created', 50, 0, {
    space: spaceId,
  })
  return http.ok(c, records.map(function (r) {
    var item = r.publicExport()
    item.progress = sumChallengeProgress(r)
    item.status = challengeStatus(r, item.progress)
    return item
  }))
}

function h_feed_post_api_challenges(c) {
  var spaceId = http.queryParam(c, 'space')
  var ctx = auth.requireRole($app, c, spaceId, ['owner', 'partner'])
  if (!ctx) return
  var data = body(c)
  if (!data.title || !data.target) {
    return http.fail(c, 422, 'invalid_challenge', 'title e target são obrigatórios')
  }
  var collection = $app.findCollectionByNameOrId('challenges')
  var record = new Record(collection)
  record.set('space', spaceId)
  record.set('title', data.title)
  record.set('metric', data.metric || 'livros')
  record.set('period', data.period || 'mes')
  record.set('target', data.target)
  record.set('start_date', data.startDate)
  record.set('end_date', data.endDate)
  record.set('grace_hours', data.graceHours === undefined ? 24 : data.graceHours)
  record.set('status', 'aberto')
  record.set('created_by', ctx.userId)
  record.set('sync_id', engine.uid())
  $app.save(record)
  audit.writeAudit($app, { space: spaceId, actor: ctx.userId, action: 'challenge.create', entity: 'challenges', entityId: record.id })
  return http.ok(c, record.publicExport(), 201)
}

// Close expired challenges every 15 minutes using the same grace rule (FR-026).
function cron_feed() {
  var list = $app.findRecordsByFilter('challenges', 'status = "aberto" && deleted_at = null', '', 0, 0, {})
  for (var i = 0; i < list.length; i++) {
    var progress = sumChallengeProgress(list[i])
    var status = challengeStatus(list[i], progress)
    if (status !== 'aberto') {
      list[i].set('status', status)
      $app.save(list[i])
    }
  }
}

module.exports = {
  h_feed_get_api_feed: h_feed_get_api_feed,
  h_feed_post_api_posts: h_feed_post_api_posts,
  h_feed_post_api_posts_id_reactions: h_feed_post_api_posts_id_reactions,
  h_feed_get_api_posts_id_comments: h_feed_get_api_posts_id_comments,
  h_feed_post_api_posts_id_comments: h_feed_post_api_posts_id_comments,
  h_feed_post_api_comments_id_reactions: h_feed_post_api_comments_id_reactions,
  h_feed_get_api_challenges: h_feed_get_api_challenges,
  h_feed_post_api_challenges: h_feed_post_api_challenges,
  cron_feed: cron_feed
}
