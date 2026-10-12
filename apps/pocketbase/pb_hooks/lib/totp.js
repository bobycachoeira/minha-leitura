/// <reference path="../../pb_data/types.d.ts" />
/**
 * T063 — TOTP (RFC 6238) with SHA-1 + HMAC, implemented in pure JS because the
 * Goja runtime has no crypto primitives. Base32 secrets are compatible with
 * standard authenticator apps.
 */

var BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

function rotl(n, s) {
  return ((n << s) | (n >>> (32 - s))) >>> 0
}

function sha1(bytes) {
  var h0 = 0x67452301
  var h1 = 0xefcdab89
  var h2 = 0x98badcfe
  var h3 = 0x10325476
  var h4 = 0xc3d2e1f0
  var msg = bytes.slice()
  var bitLen = bytes.length * 8
  msg.push(0x80)
  while (msg.length % 64 !== 56) msg.push(0)
  var high = Math.floor(bitLen / 0x100000000)
  var low = bitLen >>> 0
  msg.push((high >>> 24) & 0xff, (high >>> 16) & 0xff, (high >>> 8) & 0xff, high & 0xff)
  msg.push((low >>> 24) & 0xff, (low >>> 16) & 0xff, (low >>> 8) & 0xff, low & 0xff)

  var w = new Array(80)
  for (var i = 0; i < msg.length; i += 64) {
    for (var j = 0; j < 16; j++) {
      w[j] = (msg[i + j * 4] << 24) | (msg[i + j * 4 + 1] << 16) | (msg[i + j * 4 + 2] << 8) | msg[i + j * 4 + 3]
    }
    for (var j = 16; j < 80; j++) w[j] = rotl(w[j - 3] ^ w[j - 8] ^ w[j - 14] ^ w[j - 16], 1)

    var a = h0
    var b = h1
    var c = h2
    var d = h3
    var e = h4
    for (var j = 0; j < 80; j++) {
      var f
      var k
      if (j < 20) {
        f = (b & c) | (~b & d)
        k = 0x5a827999
      } else if (j < 40) {
        f = b ^ c ^ d
        k = 0x6ed9eba1
      } else if (j < 60) {
        f = (b & c) | (b & d) | (c & d)
        k = 0x8f1bbcdc
      } else {
        f = b ^ c ^ d
        k = 0xca62c1d6
      }
      var temp = (rotl(a, 5) + f + e + k + w[j]) >>> 0
      e = d
      d = c
      c = rotl(b, 30)
      b = a
      a = temp
    }
    h0 = (h0 + a) >>> 0
    h1 = (h1 + b) >>> 0
    h2 = (h2 + c) >>> 0
    h3 = (h3 + d) >>> 0
    h4 = (h4 + e) >>> 0
  }

  var out = []
  var hs = [h0, h1, h2, h3, h4]
  for (var h = 0; h < 5; h++) {
    out.push((hs[h] >>> 24) & 0xff, (hs[h] >>> 16) & 0xff, (hs[h] >>> 8) & 0xff, hs[h] & 0xff)
  }
  return out
}

function hmacSha1(key, msg) {
  var blockSize = 64
  var k = key.slice()
  if (k.length > blockSize) k = sha1(k)
  while (k.length < blockSize) k.push(0)
  var outer = []
  var inner = []
  for (var i = 0; i < blockSize; i++) {
    outer.push(k[i] ^ 0x5c)
    inner.push(k[i] ^ 0x36)
  }
  return sha1(outer.concat(sha1(inner.concat(msg))))
}

function base32Decode(input) {
  var clean = String(input).toUpperCase().replace(/=+$/, '')
  var bits = 0
  var value = 0
  var output = []
  for (var i = 0; i < clean.length; i++) {
    var idx = BASE32.indexOf(clean.charAt(i))
    if (idx === -1) continue
    value = (value << 5) | idx
    bits += 5
    if (bits >= 8) {
      bits -= 8
      output.push((value >>> bits) & 0xff)
    }
  }
  return output
}

function base32Encode(bytes) {
  var bits = 0
  var value = 0
  var output = ''
  for (var i = 0; i < bytes.length; i++) {
    value = (value << 8) | bytes[i]
    bits += 8
    while (bits >= 5) {
      bits -= 5
      output += BASE32.charAt((value >>> bits) & 31)
    }
  }
  if (bits > 0) output += BASE32.charAt((value << (5 - bits)) & 31)
  return output
}

function stringToBytes(str) {
  var out = []
  for (var i = 0; i < str.length; i++) out.push(str.charCodeAt(i) & 0xff)
  return out
}

function hotp(key, counter) {
  var msg = []
  for (var i = 7; i >= 0; i--) msg.push(Math.floor(counter / Math.pow(2, i * 8)) & 0xff)
  var hash = hmacSha1(key, msg)
  var offset = hash[hash.length - 1] & 0x0f
  var code =
    ((hash[offset] & 0x7f) << 24) |
    ((hash[offset + 1] & 0xff) << 16) |
    ((hash[offset + 2] & 0xff) << 8) |
    (hash[offset + 3] & 0xff)
  return String(code % 1000000).padStart(6, '0')
}

function verify(code, secret, window) {
  if (!code || !secret) return false
  var key = base32Decode(secret)
  var counter = Math.floor(Date.now() / 1000 / 30)
  var span = window === undefined ? 1 : window
  for (var i = -span; i <= span; i++) {
    if (hotp(key, counter + i) === String(code)) return true
  }
  return false
}

function generateSecret() {
  var bytes = sha1(stringToBytes($security.randomString(64))).slice(0, 20)
  return base32Encode(bytes)
}

module.exports = {
  verify: verify,
  hotp: hotp,
  generateSecret: generateSecret,
  base32Decode: base32Decode,
}
