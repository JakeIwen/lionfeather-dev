import type { ProjectSlug } from './content/projects'

export const recommendationPath = '/recommendation'
export const projectRoute = '/work/:slug'

export function projectPath(slug: ProjectSlug) {
  return `/work/${slug}`
}
