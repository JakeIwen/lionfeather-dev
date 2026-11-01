// An article as the owner saved it from the site: it replaces the version in
// src/content/articles.ts until it is discarded. The Worker validates writes
// with articleEditProblem and injects the saved edits into every page; the app
// reads them through currentArticles.ts.
import {
  isArticleSlug,
  type Article,
  type ArticleSlug,
} from '../content/articles'
import { isRecord } from '../jsonValues'
import { articleMarkdown, parseArticleMarkdown } from './articleMarkdown'

export type ArticleEditFields = {
  title: string
  dek: string
  tags: string[]
  // ISO date, as in Article.published.
  published: string
  markdown: string
}

export type ArticleEdit = ArticleEditFields & { updatedAt: number }

export type ArticleEdits = Partial<Record<ArticleSlug, ArticleEdit>>

export const articleEditsElementId = 'article-edits'

export const articleEditLimits = {
  title: 200,
  dek: 400,
  tags: 12,
  tag: 60,
  markdown: 100_000,
} as const

const isoDate = /^\d{4}-\d{2}-\d{2}$/
const isDate = (value: unknown): value is string =>
  typeof value === 'string' &&
  isoDate.test(value) &&
  new Date(`${value}T00:00:00Z`).toISOString().startsWith(value)

function textProblem(
  name: string,
  value: unknown,
  limit: number,
): string | undefined {
  if (typeof value !== 'string' || value.trim() === '')
    return `${name} must not be empty.`
  if (value.length > limit) return `${name} is over ${limit} characters.`
  return undefined
}

/**
 * Whether the value has an article's fields and fits the size limit, whatever
 * its content; a draft sent for review only needs this much.
 */
export function isArticleEditShape(value: unknown): value is ArticleEditFields {
  if (!isRecord(value)) return false
  const { title, dek, tags, published, markdown } = value
  return (
    [title, dek, published, markdown].every(
      (field) => typeof field === 'string',
    ) &&
    (markdown as string).length <= articleEditLimits.markdown &&
    Array.isArray(tags) &&
    tags.every((tag) => typeof tag === 'string')
  )
}

/** Why a write is rejected, or undefined when it can be saved. */
export function articleEditProblem(value: unknown): string | undefined {
  if (!isRecord(value)) return 'The article must be an object.'
  const fieldProblem =
    textProblem('The title', value.title, articleEditLimits.title) ??
    textProblem('The summary', value.dek, articleEditLimits.dek) ??
    textProblem('The article', value.markdown, articleEditLimits.markdown)
  if (fieldProblem) return fieldProblem
  if (!isDate(value.published))
    return 'The publication date must be a YYYY-MM-DD date.'
  const { tags } = value
  if (!Array.isArray(tags)) return 'Tags must be a list.'
  if (tags.length > articleEditLimits.tags)
    return `Use at most ${articleEditLimits.tags} tags.`
  for (const tag of tags) {
    const problem = textProblem('A tag', tag, articleEditLimits.tag)
    if (problem) return problem
  }
  const [first] = parseArticleMarkdown(value.markdown as string).problems
  return first ? `Line ${first.line}: ${first.message}` : undefined
}

/** The saved fields of a valid write, with whitespace trimmed. */
export function articleEditFields(
  value: Record<string, unknown>,
): ArticleEditFields {
  return {
    title: (value.title as string).trim(),
    dek: (value.dek as string).trim(),
    tags: (value.tags as string[]).map((tag) => tag.trim()),
    published: value.published as string,
    markdown: value.markdown as string,
  }
}

/** The saved edits that still validate and name a current article. */
export function normalizeArticleEdits(value: unknown): ArticleEdits {
  const edits: ArticleEdits = {}
  if (!isRecord(value)) return edits
  for (const [slug, edit] of Object.entries(value)) {
    if (!isArticleSlug(slug) || !isRecord(edit)) continue
    if (articleEditProblem(edit) || typeof edit.updatedAt !== 'number') continue
    edits[slug] = { ...articleEditFields(edit), updatedAt: edit.updatedAt }
  }
  return edits
}

/** The fields an editor starts from for an article that has no edit. */
export const articleEditFieldsOf = (article: Article): ArticleEditFields => ({
  title: article.title,
  dek: article.dek,
  tags: [...article.tags],
  published: article.published,
  markdown: articleMarkdown(article.blocks),
})

/** The article with an edit's fields in place of the code's. */
export const withArticleEdit = (
  article: Article,
  edit: ArticleEditFields,
): Article => ({
  ...article,
  title: edit.title,
  dek: edit.dek,
  tags: edit.tags,
  published: edit.published,
  blocks: parseArticleMarkdown(edit.markdown).blocks,
})
