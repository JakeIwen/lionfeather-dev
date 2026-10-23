import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { articleReadingTime } from '../../components/writing/articleReadingTime'
import { formatArticleDate } from '../../components/writing/formatArticleDate'
import { articles } from '../../content/articles'
import { articlePath } from '../../routes'
import './WritingFeature.css'

export function WritingFeature() {
  const article = articles.find((item) => item.slug === 'agent-sessions')!
  return (
    <Link className="writing-feature" to={articlePath(article.slug)}>
      <div className="writing-feature-copy">
        <p className="eyebrow">
          WRITING ·{' '}
          {formatArticleDate(article.published, 'month').toUpperCase()}
        </p>
        <h3>{article.title}</h3>
        <p className="writing-feature-dek">{article.dek}</p>
        <p className="writing-feature-meta">
          {articleReadingTime(article.blocks)}
        </p>
      </div>
      <span className="writing-feature-link">
        Read the article <ArrowUpRight size={17} aria-hidden="true" />
      </span>
    </Link>
  )
}
