// AES-256-GCM encryption for X cookies at rest.
// Key: 32 bytes, from COOKIE_ENC_KEY (hex or base64). Falls back to deriving
// from AUTH_SECRET if no explicit key is set (dev convenience).
import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'node:crypto'

function getKey(): Buffer {
  const raw = process.env.COOKIE_ENC_KEY || process.env.AUTH_SECRET
  if (!raw) throw new Error('COOKIE_ENC_KEY (or AUTH_SECRET) must be set')
  // accept hex (64 chars = 32 bytes) or base64; otherwise derive via sha256
  if (/^[0-9a-fA-F]{64}$/.test(raw)) return Buffer.from(raw, 'hex')
  try {
    const b = Buffer.from(raw, 'base64')
    if (b.length === 32) return b
  } catch {
    /* ignore */
  }
  return createHash('sha256').update(raw).digest()
}

export function encryptCookie(authToken: string, ct0: string): string {
  const key = getKey()
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const payload = JSON.stringify({ auth_token: authToken, ct0 })
  const enc = Buffer.concat([cipher.update(payload, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  // format: v1.<iv>.<tag>.<ciphertext> all base64
  return ['v1', iv.toString('base64'), tag.toString('base64'), enc.toString('base64')].join('.')
}

export function decryptCookie(encrypted: string): { authToken: string; ct0: string } {
  const [ver, ivb, tagb, datab] = encrypted.split('.')
  if (ver !== 'v1') throw new Error('unsupported cookie encryption version')
  const key = getKey()
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(ivb, 'base64'))
  decipher.setAuthTag(Buffer.from(tagb, 'base64'))
  const dec = Buffer.concat([decipher.update(Buffer.from(datab, 'base64')), decipher.final()])
  const parsed = JSON.parse(dec.toString('utf8'))
  return { authToken: parsed.auth_token, ct0: parsed.ct0 }
}

export function cookieStringFromEncrypted(encrypted: string): string {
  const { authToken, ct0 } = decryptCookie(encrypted)
  return `auth_token=${authToken}; ct0=${ct0}`
}
