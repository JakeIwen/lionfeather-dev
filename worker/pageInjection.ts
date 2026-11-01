// Serves the site's HTML pages with the owner's saved settings, active theme
// and article edits written into <head>, so the first paint already matches
// them. An edited article's own page also gets its new title and summary in
// the head's metadata.
import { formatKnob, knobKeys, type ActiveTheme } from 'theme-kit/core'
import {
  articleEditsElementId,
  type ArticleEdit,
  type ArticleEdits,
} from '../src/articleEdits/articleEdit'
import { isArticleSlug } from '../src/content/articles'
import { articlePageTitle } from '../src/content/pageMeta'
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

function jsonScriptTag(id: string, value: unknown): string {
  const json = JSON.stringify(value).replace(
    unsafeInScript,
    (char) => `\\u${char.charCodeAt(0).toString(16).padStart(4, '0')}`,
  )
  return `<script type="application/json" id="${id}">${json}</script>`
}

export const settingsScriptTag = (settings: SiteSettings) =>
  jsonScriptTag(settingsElementId, settings)

export const articleEditsScriptTag = (edits: ArticleEdits) =>
  jsonScriptTag(articleEditsElementId, edits)

const articlePagePath = /^\/writing\/([^/]+?)(?:\.html)?\/?$/

/** The saved edit of the article this path shows, if it has one. */
function editOfPage(pathname: string, edits: ArticleEdits) {
  const slug = articlePagePath.exec(pathname)?.[1]
  return isArticleSlug(slug) ? edits[slug] : undefined
}

/** Rewrites the prerendered title and summary metadata to the edit's. */
function withEditedHead(rewriter: HTMLRewriter, edit: ArticleEdit) {
  const content = (value: string) => ({
    element(element: Element) {
      element.setAttribute('content', value)
    },
  })
  return rewriter
    .on('title', {
      element(element) {
        element.setInnerContent(articlePageTitle(edit.title))
      },
    })
    .on('meta[property="og:title"]', content(articlePageTitle(edit.title)))
    .on('meta[name="description"]', content(edit.dek))
    .on('meta[property="og:description"]', content(edit.dek))
    .on('meta[property="article:published_time"]', content(edit.published))
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

  const { settings, appearance, articleEdits } = await currentSiteState(env.DB)
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

  const tags =
    themeStyleTag(appearance.active) +
    settingsScriptTag(settings) +
    articleEditsScriptTag(articleEdits)
  const rewriter = new HTMLRewriter().on('head', {
    element(head) {
      head.append(tags, { html: true })
    },
  })
  const edit = editOfPage(new URL(request.url).pathname, articleEdits)
  const rewritten = (
    edit ? withEditedHead(rewriter, edit) : rewriter
  ).transform(response)
  return new Response(rewritten.body, init)
}
