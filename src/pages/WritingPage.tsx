import { Link } from 'react-router-dom'
import { articleReadingTime } from '../components/writing/articleReadingTime'
import { formatArticleDate } from '../components/writing/formatArticleDate'
import { listedArticles } from '../content/listedArticles'
import { articlePath } from '../routes'
import './WritingPage.css'

export function WritingPage() {
  return (
    <section className="writing-page container" aria-labelledby="writing-title">
      <h1 id="writing-title">Writing</h1>
      <ul className="writing-list">
        {listedArticles.map((article) => (
          <li className="writing-item" key={article.slug}>
            <h2>
              <Link className="writing-link" to={articlePath(article.slug)}>
                {article.title}
              </Link>
            </h2>
            <p className="writing-date">
              <time dateTime={article.published}>
                {formatArticleDate(article.published)}
              </time>
              <span aria-hidden="true"> · </span>
              {articleReadingTime(article.blocks)}
            </p>
            <p className="writing-summary">{article.dek}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}
