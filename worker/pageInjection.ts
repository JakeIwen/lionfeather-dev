// Serves the site's HTML pages with the owner's saved settings and active
// theme written into <head>, so the first paint already matches them.
import { formatKnob, knobKeys, type ActiveTheme } from 'theme-kit/core'
import {
  settingsElementId,
  type SiteSettings,
} from '../src/settings/siteSettings'
import { siteKnobs, themeStyleElementId } from '../src/appearance/siteTheme'
import type { Env } from './env'
import { currentSiteState } from './siteStore'

/** A :root rule of the active knobs; the values are validated numbers only. */
export function themeStyleTag({ knobs }: ActiveTheme): string {
  const declarations = knobKeys
    .map(
      (key) =>
        `${siteKnobs[key].property}:${formatKnob(siteKnobs[key], knobs[key])}`,
    )
    .join(';')
  return `<style id="${themeStyleElementId}">:root{${declarations}}</style>`
}

// Escapes what could end a script element or break a JS string, so the JSON
// stays inert data under any HTML parsing.
const unsafeInScript = /[<>&\u2028\u2029]/g

export function settingsScriptTag(settings: SiteSettings): string {
  const json = JSON.stringify(settings).replace(
    unsafeInScript,
    (char) => `\\u${char.charCodeAt(0).toString(16).padStart(4, '0')}`,
  )
  return `<script type="application/json" id="${settingsElementId}">${json}</script>`
}

const revalidationHeaders = ['if-none-match', 'if-modified-since']

/**
 * The asset response for a page request, rewritten when it is HTML. The
 * browser's conditional headers are dropped on the way in and the validators
 * on the way out, so it never revalidates into a stale copy of the settings.
 */
export async function servePage(request: Request, env: Env): Promise<Response> {
  const headers = new Headers(request.headers)
  for (const name of revalidationHeaders) headers.delete(name)
  const response = await env.ASSETS.fetch(new Request(request, { headers }))
  if (!response.headers.get('content-type')?.startsWith('text/html'))
    return response

  const { settings, appearance } = await currentSiteState(env.DB)
  const out = new Headers(response.headers)
  for (const name of ['etag', 'last-modified', 'content-length'])
    out.delete(name)
  out.set('Cache-Control', 'no-cache')
  const init = {
    status: response.status,
    statusText: response.statusText,
    headers: out,
  }
  if (request.method === 'HEAD') return new Response(null, init)

  const tags = themeStyleTag(appearance.active) + settingsScriptTag(settings)
  const rewritten = new HTMLRewriter()
    .on('head', {
      element(head) {
        head.append(tags, { html: true })
      },
    })
    .transform(response)
  return new Response(rewritten.body, init)
}
