import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { ArticleEdits } from '../../articleEdits/articleEdit'
import { articles } from '../../content/articles'
import { adminArticlePath } from '../../routes'
import { getArticleEdits } from './adminClient'
import './admin.css'
import './WritingSection.css'

const savedOn = (time: number) =>
  new Date(time).toLocaleDateString(undefined, { dateStyle: 'medium' })

/** Each article, whether a site edit replaces its code version, and its editor. */
export function WritingSection() {
  const [edits, setEdits] = useState<ArticleEdits>()
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    let current = true
    getArticleEdits().then(
      (saved) => {
        if (current) setEdits(saved)
      },
      (error) => {
        if (current)
          setLoadError(
            error instanceof Error ? error.message : 'Articles did not load.',
          )
      },
    )
    return () => {
      current = false
    }
  }, [])

  return (
    <section className="admin-section" aria-labelledby="writing-admin-title">
      <div className="admin-section-head">
        <h2 id="writing-admin-title">Writing</h2>
      </div>
      {loadError ? (
        <p className="admin-error" role="alert">
          {loadError}
        </p>
      ) : null}
      <ul className="writing-admin-list">
        {articles.map((article) => {
          const edit = edits?.[article.slug]
          return (
            <li className="writing-admin-item" key={article.slug}>
              <Link
                className="writing-admin-link"
                to={adminArticlePath(article.slug)}
              >
                {edit?.title ?? article.title}
              </Link>
              {edits ? (
                <p className="admin-note">
                  {edit
                    ? `Edited on the site ${savedOn(edit.updatedAt)}`
                    : 'Version in the code'}
                </p>
              ) : null}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
