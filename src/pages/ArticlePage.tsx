import { ArrowLeft, ArrowUpRight, Mail, PenLine } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { useArticles } from '../articleEdits/currentArticles'
import { useOwnerBrowser } from '../articleEdits/ownerBrowser'
import { email } from '../content/site'
import { adminArticlePath } from '../routes'
import { ArticleBody } from './article/ArticleBody'
import { ArticleHeading } from './article/ArticleHeading'
import { NotFoundPage } from './NotFoundPage'
import './ArticlePage.css'

export function ArticlePage() {
  const { slug } = useParams()
  const owner = useOwnerBrowser()
  const article = useArticles().find((item) => item.slug === slug)
  if (!article) return <NotFoundPage />

  return (
    <article className="article-page container">
      <div className="article-links">
        <Link className="article-back-link" to="/#work">
          <ArrowLeft size={15} aria-hidden="true" /> All work
        </Link>
        {owner ? (
          <Link
            className="article-back-link"
            to={adminArticlePath(article.slug)}
          >
            <PenLine size={15} aria-hidden="true" /> Edit
          </Link>
        ) : null}
      </div>
      <ArticleHeading article={article} />
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
