import { articleReadingTime } from '../../components/writing/articleReadingTime'
import { formatArticleDate } from '../../components/writing/formatArticleDate'
import type { Article } from '../../content/articles'
import './ArticleHeading.css'

export function ArticleHeading({ article }: { article: Article }) {
  return (
    <header className="article-heading">
      <p className="article-byline eyebrow">
        <span className="article-category">WRITING</span>
        <span aria-hidden="true">·</span>
        <time dateTime={article.published}>
          {formatArticleDate(article.published)}
        </time>
        <span aria-hidden="true">·</span>
        <span>{articleReadingTime(article.blocks)}</span>
      </p>
      <h1>{article.title}</h1>
      <p className="article-dek">{article.dek}</p>
      <p className="article-tags">{article.tags.join(' · ')}</p>
    </header>
  )
}
