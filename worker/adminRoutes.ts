// The owner-only API under /admin/api. Every request must carry the owner's
// Cloudflare Access token; writes must also come from this site's own origin.
import { adminApi, adminPath } from '../src/routes'
import { accessTokenHeader, verifyOwnerToken } from './accessJwt'
import {
  articleSlugFromPath,
  deleteArticle,
  getArticleEdits,
  putArticleEdit,
} from './adminArticles'
import {
  deleteTheme,
  getAppearance,
  putActiveTheme,
  putTheme,
  themeIdFromPath,
} from './adminAppearance'
import { BadRequest, type AdminContext } from './adminContext'
import { getMetrics } from './adminMetrics'
import {
  getReviewModels,
  getReviewSettings,
  postArticleReview,
  putReviewSettings,
  reviewSlugFromPath,
} from './adminReview'
import { getSettings, putSettings } from './adminSettings'
import type { Env } from './env'
import { errorResponse, jsonResponse } from './jsonResponse'
import { readLimitedText } from './limitedBody'

export const adminApiPrefix = `${adminPath}/api/`

// An article's Markdown is the largest admin write; this bounds what one can
// hold (articleEditLimits caps the Markdown itself).
const adminBodyLimitBytes = 256 * 1024

type Handler = (context: AdminContext) => Promise<Response> | Response
type Method = 'GET' | 'PUT' | 'POST' | 'DELETE'
type Methods = Partial<Record<Method, Handler>>

const fixedRoutes: Record<string, Methods> = {
  [adminApi.session]: { GET: ({ email }) => jsonResponse({ email }) },
  [adminApi.settings]: { GET: getSettings, PUT: putSettings },
  [adminApi.appearance]: { GET: getAppearance },
  [adminApi.appearanceActive]: { PUT: putActiveTheme },
  [adminApi.metrics]: { GET: getMetrics },
  [adminApi.articles]: { GET: getArticleEdits },
  [adminApi.reviewModels]: { GET: getReviewModels },
  [adminApi.reviewSettings]: { GET: getReviewSettings, PUT: putReviewSettings },
}

// Routes with an id: /appearance/themes/:id, /articles/:slug and
// /articles/:slug/review.
const paramRoutes: {
  param: (pathname: string) => string | undefined
  methods: (param: string) => Methods
}[] = [
  {
    param: themeIdFromPath,
    methods: (id) => ({
      PUT: (context) => putTheme(context, id),
      DELETE: (context) => deleteTheme(context, id),
    }),
  },
  {
    param: reviewSlugFromPath,
    methods: (slug) => ({
      POST: (context) => postArticleReview(context, slug),
    }),
  },
  {
    param: articleSlugFromPath,
    methods: (slug) => ({
      PUT: (context) => putArticleEdit(context, slug),
      DELETE: (context) => deleteArticle(context, slug),
    }),
  },
]

function methodsFor(pathname: string): Methods | undefined {
  for (const route of paramRoutes) {
    const param = route.param(pathname)
    if (param !== undefined) return route.methods(param)
  }
  return fixedRoutes[pathname]
}

const mutating = new Set(['PUT', 'POST', 'DELETE'])

async function readJsonBody(request: Request): Promise<unknown> {
  const text = await readLimitedText(request, adminBodyLimitBytes)
  if (text === null) throw new BadRequest('Body is too large.', 413)
  try {
    return JSON.parse(text)
  } catch {
    throw new BadRequest('Body must be JSON.')
  }
}

function resolve(
  method: string,
  pathname: string,
): { handler?: Handler; allowed: string[] } {
  const methods = methodsFor(pathname)
  return {
    handler: methods?.[method as Method],
    allowed: methods ? Object.keys(methods) : [],
  }
}

export async function handleAdmin(
  request: Request,
  env: Env,
): Promise<Response> {
  const email = await verifyOwnerToken(
    env,
    request.headers.get(accessTokenHeader),
  )
  if (!email) return errorResponse(401, 'Sign in as the site owner.')

  const url = new URL(request.url)
  if (
    mutating.has(request.method) &&
    request.headers.get('origin') !== url.origin
  )
    return errorResponse(403, 'Requests must come from this site.')

  const { handler, allowed } = resolve(request.method, url.pathname)
  if (!handler) {
    if (allowed.length === 0)
      return errorResponse(404, 'No such admin endpoint.')
    const response = errorResponse(405, 'Method not allowed.')
    response.headers.set('Allow', allowed.join(', '))
    return response
  }
  try {
    return await handler({
      request,
      env,
      url,
      email,
      json: () => readJsonBody(request),
    })
  } catch (error) {
    if (error instanceof BadRequest)
      return errorResponse(error.status, error.message)
    throw error
  }
}
