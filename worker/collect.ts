// POST /api/collect: first-party, cookieless analytics beacons. Requests that
// aren't a real visitor's own browser are dropped with the same 204 a stored
// beacon gets, so a caller learns nothing from how it was treated.
import { collectLimits } from '../src/analytics/analyticsContract'
import type { Env } from './env'
import { readLimitedText } from './limitedBody'
import { parseCollectPayload, type ValidPayload } from './collectPayload'
import { currentSiteState } from './siteStore'
import { browserFamily, deviceClass, isAutomatedClient } from './userAgent'
import { utcDay } from './utcDays'
import { visitorId } from './visitorId'

const noContent = () => new Response(null, { status: 204 })
const reject = (status: number, error: string) =>
  Response.json({ error }, { status, headers: { 'Cache-Control': 'no-store' } })

/**
 * Only a person's own browser, on the site's own pages, who hasn't asked not
 * to be measured (Global Privacy Control, or the older Do Not Track).
 */
function isCountable(request: Request): boolean {
  if (isAutomatedClient(request.headers.get('user-agent') ?? '')) return false
  if (
    request.headers.get('sec-gpc') === '1' ||
    request.headers.get('dnt') === '1'
  )
    return false
  if (request.headers.get('origin') !== new URL(request.url).origin)
    return false
  const fetchSite = request.headers.get('sec-fetch-site')
  return fetchSite === null || fetchSite === 'same-origin'
}

const isBodyType = (request: Request) =>
  /^(text\/plain|application\/json)\s*(;|$)/i.test(
    request.headers.get('content-type') ?? '',
  )

async function insertEvent(
  db: D1Database,
  request: Request,
  payload: ValidPayload,
  now: number,
) {
  const userAgent = request.headers.get('user-agent') ?? ''
  const country = request.cf?.country
  await db
    .prepare(
      `INSERT INTO events (ts, day, visitor, kind, path, name, target, referrer,
         source, country, device, browser, engaged_ms)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)`,
    )
    .bind(
      now,
      utcDay(now),
      await visitorId(db, request, now),
      payload.kind,
      payload.path,
      payload.kind === 'event' ? payload.name : null,
      payload.kind === 'event' ? payload.target : null,
      payload.kind === 'view' ? payload.referrer : null,
      payload.kind === 'view' ? payload.source : null,
      typeof country === 'string' && /^[A-Z]{2}$/.test(country)
        ? country
        : null,
      deviceClass(userAgent),
      browserFamily(userAgent),
      payload.kind === 'engage' ? payload.ms : null,
    )
    .run()
}

export async function handleCollect(
  request: Request,
  env: Env,
): Promise<Response> {
  if (request.method !== 'POST')
    return new Response(null, { status: 405, headers: { Allow: 'POST' } })
  if (!isCountable(request)) return noContent()
  const { settings } = await currentSiteState(env.DB)
  if (!settings.analytics.enabled) return noContent()

  const text = await readLimitedText(request, collectLimits.bodyBytes)
  if (text === null) return reject(413, 'Body is too large.')
  if (!isBodyType(request))
    return reject(400, 'Body must be text/plain or JSON.')
  let body: unknown
  try {
    body = JSON.parse(text)
  } catch {
    return reject(400, 'Body is not JSON.')
  }
  const parsed = parseCollectPayload(body)
  if (!parsed.ok) return reject(400, parsed.error)

  await insertEvent(env.DB, request, parsed.payload, Date.now())
  return noContent()
}
