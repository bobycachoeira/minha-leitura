/// <reference path="../../pb_data/types.d.ts" />
/**
 * T041 — AES encryption of the 2FA secret using CF_ENCRYPTION_KEY.
 * The key is derived to exactly 32 chars (PocketBase $security.encrypt requirement).
 */

function encryptionKey() {
  var raw = $os.getenv('CF_ENCRYPTION_KEY') || 'dev-insecure-encryption-key-change-me'
  return $security.sha256(raw).slice(0, 32)
}

function encryptSecret(plain) {
  if (!plain) return ''
  return $security.encrypt(plain, encryptionKey())
}

function decryptSecret(cipher) {
  if (!cipher) return ''
  try {
    return $security.decrypt(cipher, encryptionKey())
  } catch (err) {
    console.log('decryptSecret error: ' + String(err))
    return ''
  }
}

module.exports = { encryptSecret: encryptSecret, decryptSecret: decryptSecret }
