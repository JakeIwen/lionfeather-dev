// Verifies the Cloudflare Access token on admin requests. Access already gates
// /admin at the edge; this check keeps the API closed if that gate is ever
// misconfigured, and it fails closed when any of its settings is empty.
import { accessKeyFor } from './accessKeys'
import type { Env } from './env'
import { isRecord } from '../src/jsonValues'

export const accessTokenHeader = 'Cf-Access-Jwt-Assertion'

const clockSkewSeconds = 30
const maxTokenLength = 16_384

type Claims = Record<string, unknown>
type AccessSettings = Pick<
  Env,
  'ACCESS_TEAM_DOMAIN' | 'ACCESS_AUD' | 'OWNER_EMAIL'
>

function base64UrlBytes(part: string): Uint8Array {
  const base64 = part.replaceAll('-', '+').replaceAll('_', '/')
  const binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='))
  return Uint8Array.from(binary, (char) => char.charCodeAt(0))
}

function decodeJson(part: string): Claims {
  const value: unknown = JSON.parse(
    new TextDecoder().decode(base64UrlBytes(part)),
  )
  if (!isRecord(value)) throw new Error('Invalid JWT')
  return value
}

const isNumericDate = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0

function claimsAreValid(
  claims: Claims,
  access: AccessSettings,
  seconds: number,
) {
  const audiences = typeof claims.aud === 'string' ? [claims.aud] : claims.aud
  return (
    claims.iss === `https://${access.ACCESS_TEAM_DOMAIN}` &&
    Array.isArray(audiences) &&
    audiences.every((value) => typeof value === 'string') &&
    audiences.includes(access.ACCESS_AUD) &&
    typeof claims.email === 'string' &&
    claims.email.toLowerCase() === access.OWNER_EMAIL.toLowerCase() &&
    isNumericDate(claims.exp) &&
    claims.exp > seconds - clockSkewSeconds &&
    isNumericDate(claims.iat) &&
    claims.iat <= seconds + clockSkewSeconds &&
    claims.iat < claims.exp &&
    (claims.nbf === undefined ||
      (isNumericDate(claims.nbf) &&
        claims.nbf <= seconds + clockSkewSeconds &&
        claims.nbf < claims.exp))
  )
}

/** The owner's email when the token is a valid Access token for them. */
export async function verifyOwnerToken(
  access: AccessSettings,
  token: string | null,
  now = Date.now(),
): Promise<string | undefined> {
  if (!access.ACCESS_TEAM_DOMAIN || !access.ACCESS_AUD || !access.OWNER_EMAIL)
    return undefined
  if (!token || token.length > maxTokenLength) return undefined
  try {
    const parts = token.split('.')
    if (
      parts.length !== 3 ||
      parts.some((part) => !/^[A-Za-z0-9_-]+$/.test(part))
    )
      return undefined
    const [headerPart, payloadPart, signaturePart] = parts as [
      string,
      string,
      string,
    ]
    const header = decodeJson(headerPart)
    if (
      header.alg !== 'RS256' ||
      typeof header.kid !== 'string' ||
      !header.kid ||
      header.kid.length > 128 ||
      header.crit !== undefined ||
      header.b64 !== undefined
    )
      return undefined
    const claims = decodeJson(payloadPart)
    if (!claimsAreValid(claims, access, now / 1000)) return undefined
    const key = await accessKeyFor(access.ACCESS_TEAM_DOMAIN, header.kid, now)
    if (!key) return undefined
    const signed = new TextEncoder().encode(`${headerPart}.${payloadPart}`)
    const verified = await crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5',
      key,
      base64UrlBytes(signaturePart),
      signed,
    )
    return verified ? (claims.email as string) : undefined
  } catch {
    return undefined
  }
}
