// The owner-only API under /admin/api. Every request must carry the owner's
// Cloudflare Access token; writes must also come from this site's own origin.
import { adminApi, adminPath } from '../src/routes'
import { accessTokenHeader, verifyOwnerToken } from './accessJwt'
import {
  deleteTheme,
  getAppearance,
  putActiveTheme,
  putTheme,
  themeIdFromPath,
} from './adminAppearance'
import { BadRequest, type AdminContext } from './adminContext'
import { getMetrics } from './adminMetrics'
import { getSettings, putSettings } from './adminSettings'
import type { Env } from './env'
import { errorResponse, jsonResponse } from './jsonResponse'
import { readLimitedText } from './limitedBody'

export const adminApiPrefix = `${adminPath}/api/`

// Settings and themes are small; this bounds what an admin write can hold.
const adminBodyLimitBytes = 64 * 1024

type Handler = (context: AdminContext) => Promise<Response> | Response
type Method = 'GET' | 'PUT' | 'POST' | 'DELETE'

const fixedRoutes: Record<string, Partial<Record<Method, Handler>>> = {
  [adminApi.session]: { GET: ({ email }) => jsonResponse({ email }) },
  [adminApi.settings]: { GET: getSettings, PUT: putSettings },
  [adminApi.appearance]: { GET: getAppearance },
  [adminApi.appearanceActive]: { PUT: putActiveTheme },
  [adminApi.metrics]: { GET: getMetrics },
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
  const themeId = themeIdFromPath(pathname)
  const methods: Partial<Record<Method, Handler>> | undefined =
    themeId === undefined
      ? fixedRoutes[pathname]
      : {
          PUT: (context) => putTheme(context, themeId),
          DELETE: (context) => deleteTheme(context, themeId),
        }
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
