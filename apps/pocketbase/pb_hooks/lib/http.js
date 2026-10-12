/// <reference path="../../pb_data/types.d.ts" />
/**
 * T045 — response envelope, structured logging and request-context helpers.
 *
 * PocketBase 0.23 JSVM exposes request data via `c.requestInfo()` and
 * `c.request.*` — these helpers centralize that access (no secrets logged).
 */

function requestBody(c) {
  try {
    const info = c.requestInfo()
    return (info && info.body) || {}
  } catch (err) {
    return {}
  }
}

function queryParam(c, name) {
  try {
    const info = c.requestInfo()
    const query = (info && info.query) || {}
    const value = query[name]
    if (Array.isArray(value)) return value[0] || ''
    return value === undefined || value === null ? '' : value
  } catch (err) {
    return ''
  }
}

function pathParam(c, name) {
  try {
    return c.request.pathValue(name) || ''
  } catch (err) {
    return ''
  }
}

function header(c, name) {
  try {
    return c.request.header.get(name) || ''
  } catch (err) {
    return ''
  }
}

function authRecord(c) {
  try {
    const info = c.requestInfo()
    if (info && info.auth) return info.auth
  } catch (err) {
    // fall back to token resolution below
  }
  try {
    const raw = header(c, 'Authorization') || ''
    const match = raw.match(/^Bearer\s+(.+)$/i)
    if (!match) return null
    return $app.findAuthRecordByToken(match[1], 'auth')
  } catch (err) {
    return null
  }
}

/** Reads a JSON field from a record (JSVM `get()` returns bytes for json). */
function jsonField(record, name, fallback) {
  try {
    const raw = record.getString(name)
    if (!raw) return fallback
    const parsed = JSON.parse(raw)
    return parsed === undefined || parsed === null ? fallback : parsed
  } catch (err) {
    return fallback
  }
}

function ok(c, data, status) {
  return c.json(status || 200, data)
}

function fail(c, status, code, message, details) {
  return c.json(status, { code: code, message: message, details: details })
}

function logStructured(event, fields) {
  var payload = { event: event, ts: new Date().toISOString() }
  if (fields) {
    for (var k in fields) {
      if (Object.prototype.hasOwnProperty.call(fields, k)) payload[k] = fields[k]
    }
  }
  console.log(JSON.stringify(payload))
}

module.exports = {
  requestBody: requestBody,
  queryParam: queryParam,
  pathParam: pathParam,
  header: header,
  authRecord: authRecord,
  jsonField: jsonField,
  ok: ok,
  fail: fail,
  logStructured: logStructured,
}
