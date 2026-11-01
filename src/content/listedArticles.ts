import { articles, type Article } from './articles'

/** Newest first, without the unlisted ones. */
export const listArticles = (list: readonly Article[]) =>
  list
    .filter((article) => !article.unlisted)
    .sort((a, b) => b.published.localeCompare(a.published))

export const listedArticles = listArticles(articles)
