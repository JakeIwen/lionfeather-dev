// The Worker in front of the static site. Entry point only: it routes each
// request to the module that owns it.
import { collectPath } from '../src/routes'
import { adminApiPrefix, handleAdmin } from './adminRoutes'
import { handleCollect } from './collect'
import type { Env } from './env'
import { errorResponse } from './jsonResponse'
import { servePage } from './pageInjection'
import { pruneOldData } from './prune'

async function route(request: Request, env: Env): Promise<Response> {
  const { pathname } = new URL(request.url)
  if (pathname === collectPath) return handleCollect(request, env)
  if (pathname.startsWith(adminApiPrefix)) return handleAdmin(request, env)
  if (pathname.startsWith('/api/'))
    return errorResponse(404, 'No such endpoint.')
  if (request.method === 'GET' || request.method === 'HEAD')
    return servePage(request, env)
  return env.ASSETS.fetch(request)
}

export default {
  async fetch(request, env) {
    try {
      return await route(request, env)
    } catch (error) {
      console.error('Unhandled error', error)
      return errorResponse(500, 'Something went wrong.')
    }
  },
  async scheduled(controller, env, ctx) {
    ctx.waitUntil(pruneOldData(env.DB, controller.scheduledTime))
  },
} satisfies ExportedHandler<Env>
