// Test-only stand-in for Cloudflare Access: a generated RSA key, the JWKS the
// Worker fetches for it, and signed tokens in the shape Access issues.
import { webcrypto } from 'node:crypto'

const { subtle } = webcrypto
const rsa = {
  name: 'RSASSA-PKCS1-v1_5',
  modulusLength: 2048,
  publicExponent: new Uint8Array([1, 0, 1]),
  hash: 'SHA-256',
}

export const teamDomain = 'proud-base-5e35.cloudflareaccess.com'
export const certsUrl = `https://${teamDomain}/cdn-cgi/access/certs`
export const testAudience = 'test-audience-tag'
export const ownerEmail = 'lionfeatherdev@gmail.com'

const encode = (value) =>
  Buffer.from(
    typeof value === 'string' ? value : JSON.stringify(value),
  ).toString('base64url')

export async function createSigningKey(kid) {
  const pair = await subtle.generateKey(rsa, true, ['sign', 'verify'])
  const jwk = await subtle.exportKey('jwk', pair.publicKey)
  return {
    kid,
    privateKey: pair.privateKey,
    jwk: { ...jwk, kid, alg: 'RS256' },
  }
}

export const jwksFor = (...keys) => ({ keys: keys.map((key) => key.jwk) })

/** A signed token; `claims` and `header` override the valid defaults. */
export async function signToken(
  key,
  { claims = {}, header = {}, audience = testAudience } = {},
) {
  const now = Math.floor(Date.now() / 1000)
  const payload = {
    iss: `https://${teamDomain}`,
    aud: [audience],
    email: ownerEmail,
    iat: now - 10,
    nbf: now - 10,
    exp: now + 3600,
    ...claims,
  }
  const signedPart = `${encode({ alg: 'RS256', kid: key.kid, typ: 'JWT', ...header })}.${encode(payload)}`
  const signature = await subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key.privateKey,
    Buffer.from(signedPart),
  )
  return `${signedPart}.${Buffer.from(signature).toString('base64url')}`
}
