// The owner's live state for the local server. lionfeather.dev's Worker writes
// the active theme, site settings and article edits into every page's head
// (worker/pageInjection.ts); the local server has no Worker, so it copies
// those tags from the production homepage. They are the same on every page,
// so one cached fetch serves all routes.

export const LIVE_ORIGIN = 'https://lionfeather.dev'

// These repeat the ids in src/appearance/siteTheme.ts, src/settings/siteSettings.ts
// and src/articleEdits/articleEdit.ts, because the boot service runs plain Node
// and can't import those TypeScript modules. site-server.test.mjs fails if
// they drift apart.
export const themeStyleElementId = 'theme-knobs'
export const settingsElementId = 'site-settings'
export const articleEditsElementId = 'article-edits'

// A Worker-written :root rule holds only validated numbers; anything else in
// that slot is not ours to put into a local page.
const themeStyle = new RegExp(
  `<style id="${themeStyleElementId}">:root\\{[-a-z0-9:;.]*\\}</style>`,
)
const jsonScript = (id) =>
  new RegExp(`<script type="application/json" id="${id}">([^<]*)</script>`)

/**
 * The tags the Worker injected into a production page, or null when the page
 * doesn't carry all three (an older Worker shape, an error page).
 */
export function extractInjectedTags(html) {
  const tags = [html.match(themeStyle)?.[0]]
  for (const id of [settingsElementId, articleEditsElementId]) {
    const match = html.match(jsonScript(id))
    try {
      JSON.parse(match?.[1])
      tags.push(match[0])
    } catch {
      return null
    }
  }
  return tags.every(Boolean) ? tags.join('') : null
}

/** Inserts tags at the end of <head>, where the Worker appends them. */
export function injectHeadTags(html, tags) {
  const end = html.indexOf('</head>')
  return end === -1 ? html : html.slice(0, end) + tags + html.slice(end)
}

/**
 * Returns `headTags()`, which resolves to the tags to inject or '' for none.
 * It never rejects and never waits longer than `timeoutMs`, and only before
 * the first successful pull: a failed pull is remembered for `retryMs` so an
 * unreachable production costs one slow page, not every page. Later refreshes
 * run in the background, and the last good tags keep serving through a failed
 * one.
 */
export function createLiveSiteState({
  origin = LIVE_ORIGIN,
  fetchPage = fetch,
  ttlMs = 60_000,
  retryMs = 15_000,
  timeoutMs = 8_000,
  log = (message) => console.warn(message),
} = {}) {
  let tags = ''
  let expiresAt = 0
  let pending = null
  let failing = false

  async function pull() {
    try {
      const response = await fetchPage(`${origin}/`, {
        headers: {
          Accept: 'text/html',
          'User-Agent': 'lionfeather-local-server',
        },
        signal: AbortSignal.timeout(timeoutMs),
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const found = extractInjectedTags(await response.text())
      if (!found) throw new Error('the page carried no injected state')
      tags = found
      expiresAt = Date.now() + ttlMs
      if (failing) log(`Live site state from ${origin} is available again.`)
      failing = false
    } catch (error) {
      expiresAt = Date.now() + retryMs
      // Once per outage, not per request.
      if (!failing)
        log(`Serving without live site state from ${origin}: ${error.message}`)
      failing = true
    } finally {
      pending = null
    }
  }

  return {
    async headTags() {
      if (Date.now() >= expiresAt) pending ??= pull()
      // Production can take seconds to answer, so a refresh never holds up a
      // page that has an earlier copy to show; only the first pull is awaited.
      if (!tags) await pending
      return tags
    },
  }
}
