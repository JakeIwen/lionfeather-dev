import { listedArticles } from '../../src/content/listedArticles'
import { siteDescription, siteName, siteOrigin } from '../../src/content/site'
import { articlePath, homePath } from '../../src/routes'
import { escapeMarkup } from './escapeMarkup'

export function renderFeed(): string {
  const entries = listedArticles.map((article) => {
    const url = escapeMarkup(
      new URL(articlePath(article.slug), siteOrigin).href,
    )
    return `<item>
      <title>${escapeMarkup(article.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <description>${escapeMarkup(article.dek)}</description>
      <pubDate>${new Date(article.published).toUTCString()}</pubDate>
    </item>`
  })
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escapeMarkup(siteName)}</title>
    <link>${escapeMarkup(new URL(homePath, siteOrigin).href)}</link>
    <description>${escapeMarkup(siteDescription)}</description>
    ${entries.join('\n    ')}
  </channel>
</rss>
`
}
