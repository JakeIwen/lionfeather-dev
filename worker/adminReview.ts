// Review endpoints: the model catalog and the owner's choice, and a review of
// an article draft, streamed back from the review service as it runs.
import {
  articleEditFieldsOf,
  articleEditLimits,
  type ArticleEditFields,
} from '../src/articleEdits/articleEdit'
import {
  normalizeReviewSettings,
  reviewSettingsProblem,
} from '../src/articleReview/reviewContract'
import { articles, isArticleSlug } from '../src/content/articles'
import { fieldOf, isRecord } from '../src/jsonValues'
import type { AdminContext } from './adminContext'
import { errorResponse, jsonResponse } from './jsonResponse'
import {
  fetchReviewCatalog,
  reviewServiceFetch,
  serviceError,
} from './reviewService'
import {
  loadReviewSettings,
  loadSiteState,
  saveReviewSettings,
} from './siteStore'

const reviewSuffix = '/review'

export async function getReviewModels({ env }: AdminContext) {
  return jsonResponse(await fetchReviewCatalog(env))
}

export async function getReviewSettings({ env }: AdminContext) {
  return jsonResponse(await loadReviewSettings(env.DB))
}

export async function putReviewSettings({ env, json }: AdminContext) {
  const settings = fieldOf(await json(), 'review')
  const problem = reviewSettingsProblem(settings, await fetchReviewCatalog(env))
  if (problem) return errorResponse(400, problem)
  const saved = normalizeReviewSettings(settings)
  await saveReviewSettings(env.DB, saved)
  return jsonResponse(saved)
}

/** The slug in /admin/api/articles/:slug/review, or undefined. */
export function reviewSlugFromPath(
  pathname: string,
  articlesPath: string,
): string | undefined {
  const prefix = `${articlesPath}/`
  if (!pathname.startsWith(prefix) || !pathname.endsWith(reviewSuffix))
    return undefined
  const slug = pathname.slice(prefix.length, -reviewSuffix.length)
  return slug && !slug.includes('/') ? slug : undefined
}

// A draft under review may still have Markdown problems; it only needs the
// right shape and size.
function draftFields(value: unknown): ArticleEditFields | undefined {
  if (!isRecord(value)) return undefined
  const { title, dek, tags, published, markdown } = value
  const text = [title, dek, published, markdown]
  if (!text.every((field) => typeof field === 'string')) return undefined
  if ((markdown as string).length > articleEditLimits.markdown) return undefined
  if (!Array.isArray(tags) || !tags.every((tag) => typeof tag === 'string'))
    return undefined
  return value as ArticleEditFields
}

export async function postArticleReview(
  context: AdminContext,
  slug: string,
): Promise<Response> {
  const article = articles.find((item) => item.slug === slug)
  if (!isArticleSlug(slug) || !article)
    return errorResponse(404, `No article with slug ${slug}.`)
  const draft = draftFields(fieldOf(await context.json(), 'article'))
  if (!draft) return errorResponse(400, 'The draft is not an article.')
  const { env } = context
  const saved = (await loadSiteState(env.DB)).articleEdits[slug]
  // The version visitors see now, so the review can focus on what changed.
  const { updatedAt: _updatedAt, ...previous } = saved ?? {
    ...articleEditFieldsOf(article),
    updatedAt: 0,
  }
  const { model, effort } = await loadReviewSettings(env.DB)
  const response = await reviewServiceFetch(env, reviewSuffix, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, effort, article: draft, previous }),
    signal: context.request.signal,
  })
  if (!response.ok || !response.body) {
    // A busy service or settings it no longer accepts are the caller's to see.
    const status = [400, 429].includes(response.status) ? response.status : 502
    return errorResponse(status, await serviceError(response))
  }
  return new Response(response.body, {
    headers: {
      'Content-Type': 'application/x-ndjson',
      'Cache-Control': 'no-store',
    },
  })
}
