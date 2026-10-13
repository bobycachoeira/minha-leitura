/// <reference path="../../pb_data/types.d.ts" />
/**
 * Social layer (opt-in): follow other readers and view ONLY their `public`
 * posts. Reading data stays space-isolated.
 */

var http = require(__hooks + '/lib/http.js')
var auth = require(__hooks + '/lib/auth.js')

function userName(userId) {
  try {
    return $app.findRecordById('users', userId).getString('name')
  } catch (err) {
    return 'Leitor'
  }
}

function userAvatar(userId) {
  try {
    return $app.findRecordById('users', userId).getString('avatar_data')
  } catch (err) {
    return ''
  }
}

/** Creates a notification for `recipientId` (never for your own actions). */
function notify(recipientId, actorId, kind, opts) {
  if (!recipientId || recipientId === actorId) return
  try {
    var collection = $app.findCollectionByNameOrId('notifications')
    var record = new Record(collection)
    record.set('user', recipientId)
    record.set('actor', actorId)
    record.set('kind', kind)
    if (opts && opts.post) record.set('post', opts.post)
    if (opts && opts.comment) record.set('comment', opts.comment)
    if (opts && opts.body) record.set('body', opts.body)
    record.set('is_read', false)
    $app.save(record)
  } catch (err) {
    // notifications are best-effort
  }
}

function notificationsList(c) {
  var userId = auth.requireAuth(c)
  if (!userId) return
  var rows = $app.findRecordsByFilter('notifications', 'user = {:u} && kind != "test"', '-created', 50, 0, { u: userId })
  var out = []
  var unread = 0
  for (var i = 0; i < rows.length; i++) {
    if (!rows[i].getBool('is_read')) unread++
    var item = rows[i].publicExport()
    item.actorName = userName(rows[i].getString('actor'))
    item.actorAvatar = userAvatar(rows[i].getString('actor'))
    out.push(item)
  }
  return http.ok(c, { items: out, unread: unread })
}

function notificationsRead(c) {
  var userId = auth.requireAuth(c)
  if (!userId) return
  var rows = $app.findRecordsByFilter('notifications', 'user = {:u} && is_read = false', '', 0, 0, { u: userId })
  for (var i = 0; i < rows.length; i++) {
    rows[i].set('is_read', true)
    $app.save(rows[i])
  }
  return http.ok(c, { ok: true })
}

function isFollowing(followerId, followingId) {
  try {
    $app.findFirstRecordByFilter('follows', 'follower = {:f} && following = {:t}', {
      f: followerId,
      t: followingId,
    })
    return true
  } catch (err) {
    return false
  }
}

function publicPostsOf(userId) {
  var posts = $app.findRecordsByFilter(
    'posts',
    'actor = {:actor} && visibility = "public" && deleted_at = null',
    '-created',
    50,
    0,
    { actor: userId },
  )
  var out = []
  for (var i = 0; i < posts.length; i++) {
    var item = posts[i].publicExport()
    item.authorName = userName(posts[i].getString('actor'))
    item.authorId = posts[i].getString('actor')
    item.authorAvatar = userAvatar(posts[i].getString('actor'))
    out.push(item)
  }
  return out
}

function people(c) {
  var userId = auth.requireAuth(c)
  if (!userId) return
  var email = (http.queryParam(c, 'email') || '').toLowerCase().trim()
  if (!email) return http.fail(c, 422, 'email_required', 'informe um e-mail')
  var found = null
  try {
    found = $app.findAuthRecordByEmail('users', email)
  } catch (err) {
    return http.ok(c, { found: false })
  }
  if (found.id === userId) return http.ok(c, { found: false, self: true })
  return http.ok(c, { found: true, id: found.id, name: found.getString('name'), isFollowing: isFollowing(userId, found.id) })
}

function following(c) {
  var userId = auth.requireAuth(c)
  if (!userId) return
  var rows = $app.findRecordsByFilter('follows', 'follower = {:f}', '-created', 100, 0, { f: userId })
  var out = []
  for (var i = 0; i < rows.length; i++) {
    var target = rows[i].getString('following')
    out.push({ id: target, name: userName(target) })
  }
  return http.ok(c, out)
}

function profile(c) {
  var userId = auth.requireAuth(c)
  if (!userId) return
  var targetId = http.pathParam(c, 'id')
  var found = null
  try {
    found = $app.findRecordById('users', targetId)
  } catch (err) {
    return http.fail(c, 404, 'not_found', 'Pessoa não encontrada')
  }
  var followers = $app.findRecordsByFilter('follows', 'following = {:t}', '', 0, 0, { t: targetId })
  var follows = $app.findRecordsByFilter('follows', 'follower = {:f}', '', 0, 0, { f: targetId })
  var posts = publicPostsOf(found.id)
  var likes = 0
  var commentsCount = 0
  for (var i = 0; i < posts.length; i++) {
    likes += $app.findRecordsByFilter('reactions', 'post = {:p} && deleted_at = null', '', 0, 0, { p: posts[i].id }).length
    commentsCount += $app.findRecordsByFilter('comments', 'post = {:p} && deleted_at = null', '', 0, 0, { p: posts[i].id }).length
  }
  return http.ok(c, {
    id: found.id,
    name: found.getString('name'),
    bio: found.getString('bio'),
    avatar: found.getString('avatar_data'),
    isSelf: found.id === userId,
    isFollowing: isFollowing(userId, found.id),
    followers: followers.length,
    following: follows.length,
    posts: posts.length,
    likes: likes,
    comments: commentsCount,
  })
}

function userPosts(c) {
  var userId = auth.requireAuth(c)
  if (!userId) return
  return http.ok(c, publicPostsOf(http.pathParam(c, 'id')))
}

function follow(c) {
  var userId = auth.requireAuth(c)
  if (!userId) return
  var targetId = http.pathParam(c, 'id')
  if (targetId === userId) return http.fail(c, 422, 'cannot_follow_self', 'Você não pode seguir a si mesmo')
  if (isFollowing(userId, targetId)) return http.ok(c, { following: true })
  var collection = $app.findCollectionByNameOrId('follows')
  var record = new Record(collection)
  record.set('follower', userId)
  record.set('following', targetId)
  $app.save(record)
  notify(targetId, userId, 'follow', {})
  return http.ok(c, { following: true }, 201)
}

function unfollow(c) {
  var userId = auth.requireAuth(c)
  if (!userId) return
  var targetId = http.pathParam(c, 'id')
  try {
    var existing = $app.findFirstRecordByFilter('follows', 'follower = {:f} && following = {:t}', {
      f: userId,
      t: targetId,
    })
    if (existing) $app.delete(existing)
  } catch (err) {
    // already not following
  }
  return http.ok(c, { following: false })
}

module.exports = {
  people: people,
  following: following,
  profile: profile,
  userPosts: userPosts,
  follow: follow,
  unfollow: unfollow,
  publicPostsOf: publicPostsOf,
  isFollowing: isFollowing,
  userName: userName,
  userAvatar: userAvatar,
  notify: notify,
  notificationsList: notificationsList,
  notificationsRead: notificationsRead,
}
