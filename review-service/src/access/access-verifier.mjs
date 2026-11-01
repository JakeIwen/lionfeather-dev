import { createPublicKey, timingSafeEqual, verify } from 'node:crypto'
import { CLOCK_SKEW_MS, JWKS_MIN_REFETCH_MS, JWKS_TTL_MS } from '../limits.mjs'

// Verifies the Cf-Access-Jwt-Assertion header Cloudflare Access adds after it
// accepts the Worker's service token. The service token shows up as a JWT with
// `common_name` set to its client id (no `email`), so that claim is what ties a
// request to the one caller allowed here; the audience ties it to this app.
export class AccessDenied extends Error {}

const decodePart = (part) =>
  JSON.parse(Buffer.from(part, 'base64url').toString('utf8'))

function sameText(a, b) {
  const left = Buffer.from(String(a))
  const right = Buffer.from(String(b))
  return left.length === right.length && timingSafeEqual(left, right)
}

async function fetchJwks(teamDomain) {
  const response = await fetch(`https://${teamDomain}/cdn-cgi/access/certs`, {
    signal: AbortSignal.timeout(5000),
  })
  if (!response.ok) throw new Error(`Access certs returned ${response.status}`)
  const body = await response.json()
  return Array.isArray(body?.keys) ? body.keys : []
}

/**
 * @param {{teamDomain: string, audience: string, clientId: string,
 *   fetchKeys?: () => Promise<object[]>, now?: () => number}} options
 */
export function createAccessVerifier({
  teamDomain,
  audience,
  clientId,
  fetchKeys = () => fetchJwks(teamDomain),
  now = Date.now,
}) {
  if (!teamDomain || !audience || !clientId) {
    throw new Error(
      'Access verification needs a team domain, audience and client id.',
    )
  }
  let keys = []
  let fetchedAt = -Infinity

  async function refresh() {
    keys = await fetchKeys()
    fetchedAt = now()
  }

  async function keyFor(kid) {
    if (now() - fetchedAt > JWKS_TTL_MS) await refresh()
    let jwk = keys.find((key) => key.kid === kid)
    // A rotated key shows up as an unknown kid; refetch, but not on every
    // forged token, or this would hammer Cloudflare.
    if (!jwk && now() - fetchedAt > JWKS_MIN_REFETCH_MS) {
      await refresh()
      jwk = keys.find((key) => key.kid === kid)
    }
    if (!jwk) throw new AccessDenied('unknown signing key')
    return createPublicKey({ key: jwk, format: 'jwk' })
  }

  /** Resolves with the token's claims, or rejects with AccessDenied. */
  return async function verifyAccess(token) {
    if (typeof token !== 'string') throw new AccessDenied('missing token')
    const parts = token.split('.')
    if (parts.length !== 3) throw new AccessDenied('malformed token')
    let header, claims
    try {
      header = decodePart(parts[0])
      claims = decodePart(parts[1])
    } catch {
      throw new AccessDenied('malformed token')
    }
    if (header?.alg !== 'RS256' || typeof header.kid !== 'string') {
      throw new AccessDenied('unsupported algorithm')
    }
    let key
    try {
      key = await keyFor(header.kid)
    } catch (error) {
      if (error instanceof AccessDenied) throw error
      throw new AccessDenied('signing keys unavailable')
    }
    const signature = Buffer.from(parts[2], 'base64url')
    if (
      !verify(
        'RSA-SHA256',
        Buffer.from(`${parts[0]}.${parts[1]}`),
        key,
        signature,
      )
    ) {
      throw new AccessDenied('bad signature')
    }
    const nowMs = now()
    if (
      !(typeof claims.exp === 'number') ||
      claims.exp * 1000 + CLOCK_SKEW_MS <= nowMs
    ) {
      throw new AccessDenied('expired token')
    }
    if (
      typeof claims.nbf === 'number' &&
      claims.nbf * 1000 - CLOCK_SKEW_MS > nowMs
    ) {
      throw new AccessDenied('token not yet valid')
    }
    if (claims.iss !== `https://${teamDomain}`)
      throw new AccessDenied('wrong issuer')
    const audiences = [].concat(claims.aud ?? [])
    if (!audiences.includes(audience)) throw new AccessDenied('wrong audience')
    if (!sameText(claims.common_name ?? '', clientId))
      throw new AccessDenied('wrong caller')
    return claims
  }
}
