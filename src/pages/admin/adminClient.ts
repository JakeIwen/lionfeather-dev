// Fetch client for the Worker's /admin/api routes. Cloudflare Access answers an
// expired session with a cross-origin redirect to its login (an opaqueredirect
// here, since redirects are not followed) or with 401; both mean "signed out".
import type {
  MetricsRangeDays,
  MetricsReport,
} from '../../analytics/analyticsContract'
import { adminApi } from '../../routes'
import {
  normalizeSiteSettings,
  type SiteSettings,
} from '../../settings/siteSettings'

export class SignedOutError extends Error {
  constructor() {
    super('Your session has expired. Sign in again.')
    this.name = 'SignedOutError'
  }
}

export class AdminRequestError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AdminRequestError'
  }
}

// Shared so every section can show one Sign in notice, whichever request found out.
let signedOut = false
const signedOutListeners = new Set<() => void>()

function setSignedOut(value: boolean) {
  if (signedOut === value) return
  signedOut = value
  signedOutListeners.forEach((listener) => listener())
}

export const isSignedOut = () => signedOut

export function subscribeSignedOut(listener: () => void) {
  signedOutListeners.add(listener)
  return () => {
    signedOutListeners.delete(listener)
  }
}

type RequestOptions = {
  method?: 'GET' | 'PUT' | 'DELETE'
  body?: unknown
  signal?: AbortSignal
}

function errorMessage(payload: unknown): string | undefined {
  if (typeof payload !== 'object' || payload === null) return undefined
  const { error } = payload as { error?: unknown }
  return typeof error === 'string' && error ? error : undefined
}

export async function adminRequest(
  url: string,
  { method = 'GET', body, signal }: RequestOptions = {},
): Promise<unknown> {
  let response: Response
  try {
    response = await fetch(url, {
      method,
      credentials: 'same-origin',
      redirect: 'manual',
      headers: { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    })
  } catch (error) {
    if (signal?.aborted) throw error
    throw new AdminRequestError('Could not reach the server.')
  }
  if (response.type === 'opaqueredirect' || response.status === 401) {
    setSignedOut(true)
    throw new SignedOutError()
  }
  // A non-JSON body is the SPA's index.html (no Worker behind this origin) or a proxy error page.
  const payload: unknown = await response.json().catch(() => undefined)
  if (!response.ok)
    throw new AdminRequestError(
      errorMessage(payload) ?? `The server answered ${response.status}.`,
    )
  if (payload === undefined)
    throw new AdminRequestError('The server sent an unexpected response.')
  setSignedOut(false)
  return payload
}

export async function getSession(): Promise<{ email: string }> {
  const payload = await adminRequest(adminApi.session)
  const { email } = (payload ?? {}) as { email?: unknown }
  if (typeof email !== 'string')
    throw new AdminRequestError('The session has no email address.')
  return { email }
}

export async function getSettings(): Promise<SiteSettings> {
  return normalizeSiteSettings(await adminRequest(adminApi.settings))
}

export async function saveSettings(
  settings: SiteSettings,
): Promise<SiteSettings> {
  const saved = await adminRequest(adminApi.settings, {
    method: 'PUT',
    body: { settings },
  })
  return normalizeSiteSettings(saved)
}

export async function getMetrics(
  days: MetricsRangeDays,
  signal?: AbortSignal,
): Promise<MetricsReport> {
  const report = await adminRequest(`${adminApi.metrics}?days=${days}`, {
    signal,
  })
  if (typeof report !== 'object' || report === null || !('totals' in report))
    throw new AdminRequestError('The metrics response was not a report.')
  return report as MetricsReport
}
