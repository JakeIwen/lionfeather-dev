export const recommendationPath = '/recommendation'
export const projectRoute = '/work/:slug'

export function projectPath(slug: string) {
  return `/work/${slug}`
}
