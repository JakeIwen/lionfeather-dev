import { ArrowLeft, ArrowUpRight, Mail } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { articleReadingTime } from '../components/writing/articleReadingTime'
import { formatArticleDate } from '../components/writing/formatArticleDate'
import { articles } from '../content/articles'
import { email } from '../content/site'
import { ArticleBody } from './article/ArticleBody'
import { NotFoundPage } from './NotFoundPage'
import './ArticlePage.css'

export function ArticlePage() {
  const { slug } = useParams()
  const article = articles.find((item) => item.slug === slug)
  if (!article) return <NotFoundPage />

  return (
    <article className="article-page container">
      <Link className="article-back-link" to="/#work">
        <ArrowLeft size={15} aria-hidden="true" /> All work
      </Link>
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
      <ArticleBody article={article} key={article.slug} />
      <footer className="article-contact">
        <p>Contact</p>
        <a className="article-contact-link" href={`mailto:${email}`}>
          <Mail size={16} aria-hidden="true" /> {email}
          <ArrowUpRight size={14} aria-hidden="true" />
        </a>
      </footer>
    </article>
  )
}
