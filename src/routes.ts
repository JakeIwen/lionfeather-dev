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
