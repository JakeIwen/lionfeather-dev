// Calls to the article review service (review-service/ on the Hetzner
// server). Its Access app admits only this Worker's service token, which
// Access exchanges for a JWT the service verifies.
import {
  parseReviewCatalog,
  type ReviewCatalog,
} from '../src/articleReview/reviewContract'
import { BadRequest } from './adminContext'
import type { Env } from './env'

/** The service can't be used: not configured, unreachable, or it failed. */
export class ReviewUnavailable extends BadRequest {
  constructor(message: string) {
    super(message, 503)
  }
}

export async function reviewServiceFetch(
  env: Env,
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const id = env.REVIEW_ACCESS_CLIENT_ID
  const secret = env.REVIEW_ACCESS_CLIENT_SECRET
  if (!env.REVIEW_SERVICE_URL || !id || !secret)
    throw new ReviewUnavailable(
      'Review is not set up: the Worker has no review service token.',
    )
  const headers = new Headers(init.headers)
  headers.set('CF-Access-Client-Id', id)
  headers.set('CF-Access-Client-Secret', secret)
  try {
    return await fetch(new URL(path, env.REVIEW_SERVICE_URL), {
      ...init,
      headers,
      // Access answers a rejected token with a redirect to its login page.
      redirect: 'manual',
    })
  } catch (error) {
    console.error('Review service unreachable', error)
    throw new ReviewUnavailable('The review service could not be reached.')
  }
}

/** The service's error message, or one naming its status. */
export async function serviceError(response: Response): Promise<string> {
  if (response.status >= 300 && response.status < 400)
    return 'The review service refused the Worker’s token.'
  const body: unknown = await response.json().catch(() => undefined)
  const message =
    typeof body === 'object' && body !== null && 'error' in body
      ? (body as { error: unknown }).error
      : undefined
  return typeof message === 'string'
    ? message
    : `The review service answered ${response.status}.`
}

export async function fetchReviewCatalog(env: Env): Promise<ReviewCatalog> {
  const response = await reviewServiceFetch(env, '/models')
  if (!response.ok) throw new ReviewUnavailable(await serviceError(response))
  const catalog = parseReviewCatalog(await response.json().catch(() => null))
  if (!catalog)
    throw new ReviewUnavailable(
      'The review service sent an unreadable model list.',
    )
  return catalog
}
