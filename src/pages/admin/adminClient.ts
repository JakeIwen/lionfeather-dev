// Fetch client for the Worker's /admin/api routes. Cloudflare Access answers an
// expired session with a cross-origin redirect to its login (an opaqueredirect
// here, since redirects are not followed) or with 401; both mean "signed out".
import type {
  MetricsRangeDays,
  MetricsReport,
} from '../../analytics/analyticsContract'
import {
  normalizeArticleEdits,
  type ArticleEdit,
  type ArticleEditFields,
  type ArticleEdits,
} from '../../articleEdits/articleEdit'
import {
  normalizeReviewSettings,
  parseReviewCatalog,
  type ReviewCatalog,
  type ReviewLine,
  type ReviewSettings,
} from '../../articleReview/reviewContract'
import type { ArticleSlug } from '../../content/articles'
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

/** A failure as text for the admin UI. */
export const failureMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback

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
  method?: 'GET' | 'PUT' | 'POST' | 'DELETE'
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

export async function getArticleEdits(): Promise<ArticleEdits> {
  return normalizeArticleEdits(await adminRequest(adminApi.articles))
}

export async function saveArticleEdit(
  slug: ArticleSlug,
  article: ArticleEditFields,
): Promise<ArticleEdit> {
  const saved = await adminRequest(adminApi.article(slug), {
    method: 'PUT',
    body: { article },
  })
  const edit = normalizeArticleEdits({ [slug]: saved })[slug]
  if (!edit)
    throw new AdminRequestError('The server sent back an unreadable article.')
  return edit
}

export async function deleteArticleEdit(slug: ArticleSlug): Promise<void> {
  await adminRequest(adminApi.article(slug), { method: 'DELETE' })
}

export async function getReviewCatalog(): Promise<ReviewCatalog> {
  const catalog = parseReviewCatalog(await adminRequest(adminApi.reviewModels))
  if (!catalog) throw new AdminRequestError('The model list was not readable.')
  return catalog
}

export async function getReviewSettings(): Promise<ReviewSettings> {
  return normalizeReviewSettings(await adminRequest(adminApi.reviewSettings))
}

export async function saveReviewSettings(
  review: ReviewSettings,
): Promise<ReviewSettings> {
  const saved = await adminRequest(adminApi.reviewSettings, {
    method: 'PUT',
    body: { review },
  })
  return normalizeReviewSettings(saved)
}

/**
 * Sends a draft for review and calls `onLine` with each line the review
 * streams back (started, progress, then a result or an error).
 */
export async function streamArticleReview(
  slug: ArticleSlug,
  article: ArticleEditFields,
  onLine: (line: ReviewLine) => void,
  signal: AbortSignal,
): Promise<void> {
  let response: Response
  try {
    response = await fetch(adminApi.articleReview(slug), {
      method: 'POST',
      credentials: 'same-origin',
      redirect: 'manual',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ article }),
      signal,
    })
  } catch (error) {
    if (signal.aborted) throw error
    throw new AdminRequestError('Could not reach the server.')
  }
  if (response.type === 'opaqueredirect' || response.status === 401) {
    setSignedOut(true)
    throw new SignedOutError()
  }
  if (!response.ok || !response.body) {
    const payload: unknown = await response.json().catch(() => undefined)
    throw new AdminRequestError(
      errorMessage(payload) ?? `The server answered ${response.status}.`,
    )
  }
  setSignedOut(false)
  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader()
  let buffered = ''
  for (;;) {
    const { done, value } = await reader.read()
    if (value) buffered += value
    const lines = buffered.split('\n')
    buffered = done ? '' : lines.pop()!
    for (const line of lines) {
      if (!line.trim()) continue
      try {
        onLine(JSON.parse(line) as ReviewLine)
      } catch {
        throw new AdminRequestError('The review sent an unreadable line.')
      }
    }
    if (done) return
  }
}
