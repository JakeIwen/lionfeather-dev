import { useEffect, useRef, useState } from 'react'
import type { ReviewFinding } from '../../articleReview/reviewContract'
import type { ReviewState } from './useArticleReview'
import './admin.css'
import './ArticleReviewPanel.css'

function elapsed(ms: number) {
  const seconds = Math.floor(ms / 1000)
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

function RunningReview({
  startedAt,
  model,
  onCancel,
}: {
  startedAt: number
  model?: string
  onCancel: () => void
}) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])
  return (
    <div className="review-panel-head">
      <p role="status">
        Reviewing{model ? ` with ${model}` : ''}… {elapsed(now - startedAt)}
      </p>
      <button type="button" className="admin-button" onClick={onCancel}>
        Cancel
      </button>
    </div>
  )
}

function Finding({
  finding,
  markdown,
  onApply,
}: {
  finding: ReviewFinding
  markdown: string
  onApply: () => void
}) {
  const [applied, setApplied] = useState(false)
  const applicable =
    !applied && finding.quote !== '' && markdown.includes(finding.quote)
  return (
    <li className="review-finding">
      {finding.quote ? (
        <blockquote className="review-quote">{finding.quote}</blockquote>
      ) : null}
      <p>{finding.problem}</p>
      {finding.suggestion ? (
        <p className="review-suggestion">{finding.suggestion}</p>
      ) : null}
      {applicable && finding.suggestion ? (
        <button
          type="button"
          className="admin-button"
          onClick={() => {
            setApplied(true)
            onApply()
          }}
        >
          Apply
        </button>
      ) : null}
      {applied ? <p className="admin-note">Applied.</p> : null}
    </li>
  )
}

/** The review's progress, or its summary and findings with Apply buttons. */
export function ArticleReviewPanel({
  state,
  markdown,
  onApply,
  onCancel,
  onDismiss,
}: {
  state: ReviewState
  markdown: string
  onApply: (finding: ReviewFinding) => void
  onCancel: () => void
  onDismiss: () => void
}) {
  const panel = useRef<HTMLElement>(null)
  // The Review button sits below the editor; bring the panel into view.
  useEffect(() => {
    panel.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [state.kind])
  if (state.kind === 'idle') return null
  return (
    <section className="review-panel" aria-label="Review" ref={panel}>
      {state.kind === 'running' ? (
        <RunningReview {...state} onCancel={onCancel} />
      ) : (
        <div className="review-panel-head">
          <p>
            {state.kind === 'done'
              ? `Review by ${state.model}`
              : 'The review did not finish.'}
          </p>
          <button type="button" className="admin-button" onClick={onDismiss}>
            Dismiss
          </button>
        </div>
      )}
      {state.kind === 'error' ? (
        <p className="admin-error" role="alert">
          {state.message}
        </p>
      ) : null}
      {state.kind === 'done' ? (
        <>
          <p className="review-summary">{state.summary}</p>
          {state.findings.length ? (
            <ol className="review-findings" key={state.startedAt}>
              {state.findings.map((finding, index) => (
                <Finding
                  key={index}
                  finding={finding}
                  markdown={markdown}
                  onApply={() => onApply(finding)}
                />
              ))}
            </ol>
          ) : (
            <p className="admin-note">No problems found.</p>
          )}
        </>
      ) : null}
    </section>
  )
}
