// Cloudflare Access signing keys (the team's JWKS), cached per isolate.

const keysTtlMs = 60 * 60 * 1000
// Floors the refetch rate so forged key ids can't turn requests into a flood
// of fetches. A genuine key rotation is picked up within this long.
const refetchMinIntervalMs = 60 * 1000
const maxKeys = 20

type KeyCache = {
  url: string
  keys: Map<string, CryptoKey>
  fetchedAt: number
}

let cache: KeyCache | undefined
let refreshing: Promise<void> | undefined

type Jwk = { kid?: unknown; kty?: unknown; n?: unknown; e?: unknown }

async function importKey(jwk: Jwk): Promise<CryptoKey | undefined> {
  if (jwk.kty !== 'RSA' || typeof jwk.n !== 'string') return undefined
  if (typeof jwk.e !== 'string') return undefined
  return crypto.subtle.importKey(
    'jwk',
    { kty: 'RSA', n: jwk.n, e: jwk.e, alg: 'RS256', ext: true },
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify'],
  )
}

async function fetchKeys(url: string): Promise<Map<string, CryptoKey>> {
  const response = await fetch(url, { headers: { accept: 'application/json' } })
  if (!response.ok) throw new Error(`Access keys returned ${response.status}`)
  const body = (await response.json()) as { keys?: unknown }
  const keys = new Map<string, CryptoKey>()
  for (const jwk of Array.isArray(body.keys)
    ? (body.keys as Jwk[]).slice(0, maxKeys)
    : []) {
    if (typeof jwk.kid !== 'string' || keys.has(jwk.kid)) continue
    const key = await importKey(jwk).catch(() => undefined)
    if (key) keys.set(jwk.kid, key)
  }
  return keys
}

async function refresh(url: string, now: number): Promise<void> {
  // A failed fetch keeps the old keys but still counts as an attempt, so an
  // outage doesn't turn every admin request into another fetch.
  const keys = await fetchKeys(url).catch((error) => {
    console.error('Access key fetch failed', error)
    return cache?.url === url ? cache.keys : new Map<string, CryptoKey>()
  })
  cache = { url, keys, fetchedAt: now }
}

/** The Access key with this id, refetching the set when it is old or lacks it. */
export async function accessKeyFor(
  teamDomain: string,
  kid: string,
  now = Date.now(),
): Promise<CryptoKey | undefined> {
  const url = `https://${teamDomain}/cdn-cgi/access/certs`
  if (cache?.url !== url) cache = undefined
  const wanted =
    !cache || !cache.keys.has(kid) || now - cache.fetchedAt >= keysTtlMs
  const allowed = !cache || now - cache.fetchedAt >= refetchMinIntervalMs
  if (wanted && allowed) {
    refreshing ??= refresh(url, now).finally(() => {
      refreshing = undefined
    })
    await refreshing
  }
  return cache?.keys.get(kid)
}
