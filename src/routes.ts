import type { ArticleSlug } from './content/articles'
import type { ProjectSlug } from './content/projects'

export const homePath = '/'
export const writingPath = '/writing'
export const feedPath = '/feed.xml'
export const recommendationPath = '/recommendation'
export const projectRoute = '/work/:slug'
export const articleRoute = '/writing/:slug'

export function projectPath(slug: ProjectSlug) {
  return `/work/${slug}`
}

export function articlePath(slug: ArticleSlug) {
  return `/writing/${slug}`
}

// Owner-only: Cloudflare Access guards everything under adminPath, and the
// Worker checks the Access token on every admin API request as well.
export const adminPath = '/admin'
export const adminApi = {
  session: '/admin/api/session',
  settings: '/admin/api/settings',
  appearance: '/admin/api/appearance',
  appearanceActive: '/admin/api/appearance/active',
  appearanceTheme: (id: string) =>
    `/admin/api/appearance/themes/${encodeURIComponent(id)}`,
  metrics: '/admin/api/metrics',
} as const
export const collectPath = '/api/collect'
