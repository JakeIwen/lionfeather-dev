import http from 'node:http'
import { BIND_ADDRESS } from '../config.mjs'
import { safeError } from '../safe-error.mjs'
import { HttpError, sendJson } from './json.mjs'
import { createModelsRoute } from './models-route.mjs'
import { createReviewRoute } from './review-route.mjs'

// Wires the guard and the routes. Everything except /healthz must come from
// the Worker through Cloudflare Access: right Host, then a verified Access JWT.
const hostOf = (req) =>
  String(req.headers.host ?? '')
    .toLowerCase()
    .replace(/:\d+$/, '')

export function createReviewServer({
  config,
  verifyAccess,
  catalog,
  review,
  route = {},
  log = () => {},
}) {
  const routes = {
    '/models': { GET: createModelsRoute({ catalog }) },
    '/review': { POST: createReviewRoute({ catalog, review, log, ...route }) },
  }

  async function guard(req) {
    if (hostOf(req) !== config.publicHost)
      throw new HttpError(403, 'Forbidden.')
    try {
      await verifyAccess(req.headers['cf-access-jwt-assertion'])
    } catch {
      throw new HttpError(401, 'Unauthorized.')
    }
  }

  async function handle(req, res) {
    const { pathname } = new URL(req.url ?? '/', 'http://review.invalid')
    if (pathname === '/healthz') {
      if (req.method !== 'GET') throw new HttpError(405, 'Method not allowed.')
      return sendJson(res, 200, { ok: true })
    }
    await guard(req)
    const methods = routes[pathname]
    if (!methods) throw new HttpError(404, 'Not found.')
    const handler = methods[req.method ?? '']
    if (!handler) throw new HttpError(405, 'Method not allowed.')
    await handler(req, res)
  }

  return http.createServer((req, res) => {
    handle(req, res).catch((error) => {
      if (res.headersSent) return res.destroy()
      if (error instanceof HttpError)
        return sendJson(res, error.status, { error: error.message })
      log(`unexpected error: ${safeError(error)}`)
      sendJson(res, 500, { error: 'Internal error.' })
    })
  })
}

export function listen(server, port, host = BIND_ADDRESS) {
  return new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(port, host, () => resolve(server.address().port))
  })
}
