import { useState } from 'react'
import type { ArticleEdit } from '../../articleEdits/articleEdit'
import type { MarkdownProblem } from '../../articleEdits/articleMarkdown'
import type { SaveStatus } from './useSiteSettingsDraft'
import './admin.css'
import './ArticleEditorPage.css'

const savedAt = (time: number) =>
  new Date(time).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })

/**
 * Save, Revert, and a two-step Restore that discards the site edit and brings
 * back the version in the code, with the result of the last action.
 */
export function ArticleEditorActions({
  edit,
  dirty,
  status,
  problems,
  revert,
  discard,
  reviewing,
  onReview,
}: {
  edit: ArticleEdit | null | undefined
  dirty: boolean
  status: SaveStatus
  problems: MarkdownProblem[]
  revert: () => void
  discard: () => Promise<void>
  reviewing: boolean
  onReview: () => void
}) {
  const [confirming, setConfirming] = useState(false)
  const busy = status.kind === 'saving'
  const source = edit
    ? `Showing the site edit saved ${savedAt(edit.updatedAt)}; the version in the code is hidden while it exists.`
    : 'Showing the version in the code. Saving makes a site edit that replaces it.'
  const text =
    status.text ||
    (problems.length ? 'Fix the problems above to save.' : '') ||
    (dirty ? 'Unsaved changes.' : source)
  return (
    <div className="admin-actions article-editor-actions">
      <button
        type="submit"
        className="admin-button admin-button-primary"
        disabled={!dirty || busy || problems.length > 0}
      >
        Save
      </button>
      <button
        type="button"
        className="admin-button"
        onClick={revert}
        disabled={!dirty || busy}
      >
        Revert
      </button>
      <button
        type="button"
        className="admin-button"
        onClick={onReview}
        disabled={reviewing}
        title="Have the review model check this draft before you save it"
      >
        {reviewing ? 'Reviewing…' : 'Review'}
      </button>
      {edit ? (
        <button
          type="button"
          className="admin-button"
          disabled={busy}
          onClick={() => {
            if (!confirming) return setConfirming(true)
            setConfirming(false)
            void discard()
          }}
          onBlur={() => setConfirming(false)}
        >
          {confirming
            ? 'Confirm: discard the site edit'
            : 'Restore code version'}
        </button>
      ) : null}
      <p
        role="status"
        className={
          status.kind === 'error' ? 'admin-status admin-error' : 'admin-status'
        }
      >
        {text}
      </p>
    </div>
  )
}
