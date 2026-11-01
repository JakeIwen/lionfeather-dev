// Article endpoints: the saved edits, and saving or discarding one article's.
import {
  articleEditFields,
  articleEditProblem,
  type ArticleEdit,
} from '../src/articleEdits/articleEdit'
import { isArticleSlug } from '../src/content/articles'
import { fieldOf } from '../src/jsonValues'
import { adminApi } from '../src/routes'
import type { AdminContext } from './adminContext'
import { errorResponse, jsonResponse } from './jsonResponse'
import { deleteArticleEdit, loadSiteState, saveArticleEdit } from './siteStore'

const articlePrefix = adminApi.article('')

/** The slug in /admin/api/articles/:slug (known or not), or undefined. */
export function articleSlugFromPath(pathname: string): string | undefined {
  if (!pathname.startsWith(articlePrefix)) return undefined
  const rest = pathname.slice(articlePrefix.length)
  return rest && !rest.includes('/') ? rest : undefined
}

const noSuchArticle = (slug: string) =>
  errorResponse(404, `No article with slug ${slug}.`)

export async function getArticleEdits({
  env,
}: AdminContext): Promise<Response> {
  return jsonResponse((await loadSiteState(env.DB)).articleEdits)
}

export async function putArticleEdit(
  context: AdminContext,
  slug: string,
): Promise<Response> {
  if (!isArticleSlug(slug)) return noSuchArticle(slug)
  const article = fieldOf(await context.json(), 'article')
  const problem = articleEditProblem(article)
  if (problem) return errorResponse(400, problem)
  const fields = articleEditFields(article as Record<string, unknown>)
  const updatedAt = Date.now()
  await saveArticleEdit(context.env.DB, slug, fields, updatedAt)
  return jsonResponse({ ...fields, updatedAt } satisfies ArticleEdit)
}

export async function deleteArticle(
  { env }: AdminContext,
  slug: string,
): Promise<Response> {
  if (!isArticleSlug(slug)) return noSuchArticle(slug)
  await deleteArticleEdit(env.DB, slug)
  return jsonResponse({ deleted: slug })
}
