// The owner's site settings: homepage layout and analytics. The Worker
// validates writes with siteSettingsProblem and injects the saved settings into
// every page; the app reads them through currentSiteSettings.ts. Both sides normalize, so
// content added after a save appears in its default place.
import { additionalWork } from '../content/additionalWork'
import { isArticleSlug, type ArticleSlug } from '../content/articles'
import type { ProjectSlug } from '../content/projects'
import { isRecord } from '../jsonValues'

export const homeSectionIds = [
  'selected-work',
  'additional-work',
  'recommendation',
  'about',
  'contact',
] as const
export type HomeSectionId = (typeof homeSectionIds)[number]

// Each Selected work block: a project's homepage card or feature, or the
// featured article.
export const selectedWorkIds = [
  'van-dashboard',
  'form-engine',
  'production-pipelines',
  'van-telemetry',
  'fieldwork',
  'featured-article',
] as const satisfies readonly (ProjectSlug | 'featured-article')[]
export type SelectedWorkId = (typeof selectedWorkIds)[number]

// Shown as cards (their images are in projectMedia.tsx); cards next to each
// other share a two-column row. The other blocks are full-width features.
export const selectedWorkCardIds = [
  'van-dashboard',
  'form-engine',
] as const satisfies readonly SelectedWorkId[]
export type SelectedWorkCardId = (typeof selectedWorkCardIds)[number]
export const isSelectedWorkCard = (
  id: SelectedWorkId,
): id is SelectedWorkCardId =>
  (selectedWorkCardIds as readonly string[]).includes(id)

export const homeSectionLabels: Record<HomeSectionId, string> = {
  'selected-work': 'Selected work',
  'additional-work': 'Additional work',
  recommendation: 'Recommendation',
  about: 'About',
  contact: 'Contact',
}

export const selectedWorkLabels: Record<SelectedWorkId, string> = {
  'van-dashboard': 'Van dashboard',
  'form-engine': 'Form engine',
  'production-pipelines': 'Workforce integration platform',
  'van-telemetry': 'Van telemetry',
  fieldwork: 'Fieldwork',
  'featured-article': 'Featured article',
}

export type OrderedItem<Id extends string = string> = {
  id: Id
  visible: boolean
}

export type SiteSettings = {
  homeSections: OrderedItem<HomeSectionId>[]
  selectedWork: OrderedItem<SelectedWorkId>[]
  // Ids from src/content/additionalWork.ts.
  additionalWork: OrderedItem[]
  featuredArticle: ArticleSlug
  analytics: { enabled: boolean }
}

export const settingsElementId = 'site-settings'

const additionalWorkIds = additionalWork.map((item) => item.id)
const defaultFeaturedArticle: ArticleSlug = 'agent-sessions'

const shown = <Id extends string>(ids: readonly Id[]): OrderedItem<Id>[] =>
  ids.map((id) => ({ id, visible: true }))

export function defaultSiteSettings(): SiteSettings {
  return {
    homeSections: shown(homeSectionIds),
    selectedWork: shown(selectedWorkIds),
    additionalWork: shown(additionalWorkIds),
    featuredArticle: defaultFeaturedArticle,
    analytics: { enabled: true },
  }
}

// Saved order first, then ids the save didn't know about in their default
// order. Unknown and repeated ids drop out.
function normalizeOrder<Id extends string>(
  ids: readonly Id[],
  value: unknown,
): OrderedItem<Id>[] {
  const known = new Set<string>(ids)
  const seen = new Set<string>()
  const items: OrderedItem<Id>[] = []
  for (const entry of Array.isArray(value) ? value : []) {
    if (!isRecord(entry) || typeof entry.id !== 'string') continue
    if (!known.has(entry.id) || seen.has(entry.id)) continue
    seen.add(entry.id)
    items.push({ id: entry.id as Id, visible: entry.visible !== false })
  }
  for (const id of ids) if (!seen.has(id)) items.push({ id, visible: true })
  return items
}

export function normalizeSiteSettings(value: unknown): SiteSettings {
  const saved = isRecord(value) ? value : {}
  const analytics = isRecord(saved.analytics) ? saved.analytics : {}
  return {
    homeSections: normalizeOrder(homeSectionIds, saved.homeSections),
    selectedWork: normalizeOrder(selectedWorkIds, saved.selectedWork),
    additionalWork: normalizeOrder(additionalWorkIds, saved.additionalWork),
    featuredArticle: isArticleSlug(saved.featuredArticle)
      ? saved.featuredArticle
      : defaultFeaturedArticle,
    analytics: { enabled: analytics.enabled !== false },
  }
}

function orderProblem(
  name: string,
  ids: readonly string[],
  value: unknown,
): string | undefined {
  if (!Array.isArray(value)) return `${name} must be a list.`
  const seen = new Set<string>()
  for (const entry of value) {
    if (!isRecord(entry) || typeof entry.id !== 'string')
      return `${name} entries need an id.`
    if (!ids.includes(entry.id)) return `${name} has an unknown id: ${entry.id}`
    if (seen.has(entry.id)) return `${name} lists ${entry.id} twice.`
    if (typeof entry.visible !== 'boolean')
      return `${name} entry ${entry.id} needs visible true or false.`
    seen.add(entry.id)
  }
  return undefined
}

/** Why a write is rejected, or undefined when it can be saved. */
export function siteSettingsProblem(value: unknown): string | undefined {
  if (!isRecord(value)) return 'Settings must be an object.'
  const listProblem =
    orderProblem('homeSections', homeSectionIds, value.homeSections) ??
    orderProblem('selectedWork', selectedWorkIds, value.selectedWork) ??
    orderProblem('additionalWork', additionalWorkIds, value.additionalWork)
  if (listProblem) return listProblem
  if (!isArticleSlug(value.featuredArticle))
    return 'featuredArticle must name an article.'
  if (
    !isRecord(value.analytics) ||
    typeof value.analytics.enabled !== 'boolean'
  )
    return 'analytics.enabled must be true or false.'
  return undefined
}

export const visibleIds = <Id extends string>(items: OrderedItem<Id>[]) =>
  items.filter((item) => item.visible).map((item) => item.id)

/** Whether the homepage shows Selected work: listed, with a visible block. */
export const showsSelectedWork = (settings: SiteSettings) =>
  visibleIds(settings.homeSections).includes('selected-work') &&
  visibleIds(settings.selectedWork).length > 0
