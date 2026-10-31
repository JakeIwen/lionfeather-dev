// Validates one analytics beacon. Everything stored comes from here: strings
// are length-limited and pattern-checked, never trusted as sent.
import {
  analyticsEventNames,
  collectLimits,
  type AnalyticsEventName,
} from '../src/analytics/analyticsContract'
import { isRecord } from '../src/jsonValues'

export type ValidPayload =
  | {
      kind: 'view'
      path: string
      referrer: string | null
      source: string | null
    }
  | { kind: 'engage'; path: string; ms: number }
  | {
      kind: 'event'
      path: string
      name: AnalyticsEventName
      target: string | null
    }

export type PayloadResult =
  { ok: true; payload: ValidPayload } | { ok: false; error: string }

const fail = (error: string): PayloadResult => ({ ok: false, error })

// RFC 3986 path characters: routes are slugs, and anything else is junk or an
// attempt to store markup.
const pathPattern = /^\/[A-Za-z0-9\-._~%!$&'()*+,;=:@/]*$/
const controlOrSpace = /[\x00-\x20\x7f]/
const hostPattern = /^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/
const sourcePattern = /^[a-z0-9._-]+$/i

/** The route, without query or fragment, or undefined when it isn't one. */
function cleanPath(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const path = value.split(/[?#]/, 1)[0]
  return path.length <= collectLimits.path && pathPattern.test(path)
    ? path
    : undefined
}

/** The hostname of a referrer given as a URL or a bare host. */
function referrerHost(value: string): string | undefined {
  try {
    const host = new URL(
      value.includes('://') ? value : `https://${value}`,
    ).hostname.toLowerCase()
    return host.length <= collectLimits.referrer && hostPattern.test(host)
      ? host
      : undefined
  } catch {
    return undefined
  }
}

function viewPayload(
  body: Record<string, unknown>,
  path: string,
): PayloadResult {
  // Attribution is optional and comes from arbitrary URLs: a value that doesn't
  // validate is dropped, never the view.
  const referrer =
    typeof body.referrer === 'string'
      ? (referrerHost(body.referrer) ?? null)
      : null
  const source =
    typeof body.source === 'string' &&
    body.source.length <= collectLimits.source &&
    sourcePattern.test(body.source)
      ? body.source.toLowerCase()
      : null
  return { ok: true, payload: { kind: 'view', path, referrer, source } }
}

function eventPayload(
  body: Record<string, unknown>,
  path: string,
): PayloadResult {
  const name = analyticsEventNames.find((candidate) => candidate === body.name)
  if (!name) return fail('name is not a known event.')
  let target: string | null = null
  if (body.target !== undefined && body.target !== '') {
    if (
      typeof body.target !== 'string' ||
      body.target.length > collectLimits.target ||
      controlOrSpace.test(body.target)
    )
      return fail('target is not valid.')
    target = body.target
  }
  return { ok: true, payload: { kind: 'event', path, name, target } }
}

export function parseCollectPayload(body: unknown): PayloadResult {
  if (!isRecord(body)) return fail('Body must be an object.')
  const path = cleanPath(body.path)
  if (path === undefined) return fail('path is not valid.')
  switch (body.kind) {
    case 'view':
      return viewPayload(body, path)
    case 'engage':
      return Number.isInteger(body.ms) &&
        (body.ms as number) >= 1 &&
        (body.ms as number) <= collectLimits.engageMs
        ? { ok: true, payload: { kind: 'engage', path, ms: body.ms as number } }
        : fail('ms must be a whole number of milliseconds in range.')
    case 'event':
      return eventPayload(body, path)
    default:
      return fail('kind is not valid.')
  }
}
