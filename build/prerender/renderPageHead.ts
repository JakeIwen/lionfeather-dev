import type { PageMeta } from '../../src/content/pageMeta'
import { siteName, siteOrigin } from '../../src/content/site'
import { feedPath } from '../../src/routes'
import { escapeMarkup } from './escapeMarkup'

export function renderPageHead(page: PageMeta): string {
  const meta = (property: string, value: string) =>
    `<meta property="${property}" content="${escapeMarkup(value)}" />`
  const canonical = new URL(page.canonicalPath, siteOrigin).href
  const image = page.image ? new URL(page.image, siteOrigin).href : undefined
  return [
    `<title>${escapeMarkup(page.title)}</title>`,
    `<meta name="description" content="${escapeMarkup(page.description)}" />`,
    `<link rel="canonical" href="${escapeMarkup(canonical)}" />`,
    meta('og:site_name', siteName),
    meta('og:title', page.title),
    meta('og:description', page.description),
    meta('og:type', page.type),
    meta('og:url', canonical),
    ...(image ? [meta('og:image', image)] : []),
    ...(page.published ? [meta('article:published_time', page.published)] : []),
    `<meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary'}" />`,
    `<link rel="alternate" type="application/rss+xml" title="${escapeMarkup(siteName)}" href="${escapeMarkup(new URL(feedPath, siteOrigin).href)}" />`,
  ].join('\n    ')
}
