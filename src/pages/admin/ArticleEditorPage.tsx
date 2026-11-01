import { ArrowLeft, ArrowUpRight } from 'lucide-react'
import { useEffect, useSyncExternalStore } from 'react'
import { Link, useParams } from 'react-router-dom'
import { withArticleEdit } from '../../articleEdits/articleEdit'
import { parseArticleMarkdown } from '../../articleEdits/articleMarkdown'
import { articles, type Article } from '../../content/articles'
import { adminPath, articlePath } from '../../routes'
import { ArticleBody } from '../article/ArticleBody'
import { ArticleHeading } from '../article/ArticleHeading'
import { NotFoundPage } from '../NotFoundPage'
import { isSignedOut, subscribeSignedOut } from './adminClient'
import { ArticleEditorActions } from './ArticleEditorActions'
import { ArticleEditorFields } from './ArticleEditorFields'
import { ArticleReviewPanel } from './ArticleReviewPanel'
import { SignedOutNotice } from './SignedOutNotice'
import { draftFields, useArticleDraft } from './useArticleDraft'
import { useArticleReview } from './useArticleReview'
import { useDocumentTitle } from './useDocumentTitle'
import { useSession } from './useSession'
import './admin.css'
import './ArticleEditorPage.css'

export function ArticleEditorPage() {
  const { slug } = useParams()
  // The code's version: the editor starts from it when there is no site edit.
  const article = articles.find((item) => item.slug === slug)
  if (!article) return <NotFoundPage />
  return <ArticleEditor article={article} key={article.slug} />
}

function ArticleEditor({ article }: { article: Article }) {
  useSession()
  const signedOut = useSyncExternalStore(subscribeSignedOut, isSignedOut)
  const draftState = useArticleDraft(article)
  const { draft, loadError, save } = draftState
  const review = useArticleReview(article.slug)
  useDocumentTitle(`Edit · ${draft?.title ?? article.title}`)

  // Cmd-S or Ctrl-S saves instead of saving the page as a file.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 's') {
        event.preventDefault()
        void save()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [save])

  const fields = draft ? draftFields(draft) : undefined
  const problems = fields ? parseArticleMarkdown(fields.markdown).problems : []
  const preview = fields ? withArticleEdit(article, fields) : article

  return (
    <section className="article-editor" aria-labelledby="editor-title">
      <div className="article-editor-head">
        <h1 id="editor-title">Edit article</h1>
        <Link className="article-editor-link" to={adminPath}>
          <ArrowLeft size={15} aria-hidden="true" /> Admin
        </Link>
        <Link className="article-editor-link" to={articlePath(article.slug)}>
          View article <ArrowUpRight size={15} aria-hidden="true" />
        </Link>
      </div>
      {signedOut ? <SignedOutNotice /> : null}
      {loadError ? (
        <p className="admin-error" role="alert">
          {loadError}
        </p>
      ) : null}
      <div className="article-editor-panes">
        <form
          className="article-editor-form"
          onSubmit={(event) => {
            event.preventDefault()
            void save()
          }}
        >
          {draft ? (
            <>
              <ArticleEditorFields
                draft={draft}
                problems={problems}
                onChange={draftState.change}
              />
              <ArticleEditorActions
                {...draftState}
                problems={problems}
                reviewing={review.state.kind === 'running'}
                onReview={() => fields && void review.start(fields)}
              />
            </>
          ) : loadError ? null : (
            <p className="admin-note">Loading the article…</p>
          )}
        </form>
        <div className="article-editor-preview" aria-label="Preview">
          <ArticleReviewPanel
            state={review.state}
            markdown={draft?.markdown ?? ''}
            onApply={(finding) =>
              draft &&
              draftState.change({
                markdown: draft.markdown.replace(
                  finding.quote,
                  () => finding.suggestion,
                ),
              })
            }
            onCancel={review.cancel}
            onDismiss={review.dismiss}
          />
          <ArticleHeading article={preview} />
          <ArticleBody article={preview} />
        </div>
      </div>
    </section>
  )
}
