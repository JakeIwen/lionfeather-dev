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
export const adminSettingsPath = '/admin/settings'
export const adminArticleRoute = '/admin/writing/:slug'
export function adminArticlePath(slug: ArticleSlug) {
  return `/admin/writing/${slug}`
}
export const adminApi = {
  session: '/admin/api/session',
  settings: '/admin/api/settings',
  appearance: '/admin/api/appearance',
  appearanceActive: '/admin/api/appearance/active',
  appearanceTheme: (id: string) =>
    `/admin/api/appearance/themes/${encodeURIComponent(id)}`,
  metrics: '/admin/api/metrics',
  articles: '/admin/api/articles',
  articleReview: (slug: string) =>
    `/admin/api/articles/${encodeURIComponent(slug)}/review`,
  reviewModels: '/admin/api/review/models',
  reviewSettings: '/admin/api/review/settings',
  article: (slug: string) => `/admin/api/articles/${encodeURIComponent(slug)}`,
} as const
export const collectPath = '/api/collect'
