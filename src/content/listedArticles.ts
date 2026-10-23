import { articles } from './articles'

export const listedArticles = articles
  .filter((article) => !article.unlisted)
  .sort((a, b) => b.published.localeCompare(a.published))
