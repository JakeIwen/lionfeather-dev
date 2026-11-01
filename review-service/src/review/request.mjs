// Validation of POST /review bodies: pure, record in, record out. Model and
// effort are checked separately, against the live catalog.
const DATE = /^\d{4}-\d{2}-\d{2}$/
const MAX_TEXT = { title: 300, dek: 2000, markdown: 400_000 }
const MAX_TAGS = 20
const MAX_TAG_LENGTH = 80

function articleProblem(article, where) {
  if (!article || typeof article !== 'object' || Array.isArray(article)) {
    return `${where} must be an object.`
  }
  for (const field of ['title', 'dek', 'markdown']) {
    if (typeof article[field] !== 'string')
      return `${where}.${field} must be a string.`
    if (article[field].length > MAX_TEXT[field])
      return `${where}.${field} is too long.`
  }
  if (!article.markdown.trim()) return `${where}.markdown is empty.`
  const { tags } = article
  if (!Array.isArray(tags) || tags.length > MAX_TAGS)
    return `${where}.tags must be a short list.`
  if (
    tags.some((tag) => typeof tag !== 'string' || tag.length > MAX_TAG_LENGTH)
  ) {
    return `${where}.tags must be strings.`
  }
  if (typeof article.published !== 'string' || !DATE.test(article.published)) {
    return `${where}.published must be YYYY-MM-DD.`
  }
  return null
}

const copyArticle = ({ title, dek, tags, published, markdown }) => ({
  title,
  dek,
  tags: [...tags],
  published,
  markdown,
})

/** @returns {{value: object} | {error: string}} */
export function parseReviewRequest(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { error: 'The request body must be a JSON object.' }
  }
  if (typeof body.model !== 'string' || !body.model)
    return { error: 'model must be a string.' }
  if (typeof body.effort !== 'string' || !body.effort)
    return { error: 'effort must be a string.' }
  const problem =
    articleProblem(body.article, 'article') ??
    (body.previous == null ? null : articleProblem(body.previous, 'previous'))
  if (problem) return { error: problem }
  return {
    value: {
      model: body.model,
      effort: body.effort,
      article: copyArticle(body.article),
      previous: body.previous == null ? null : copyArticle(body.previous),
    },
  }
}
