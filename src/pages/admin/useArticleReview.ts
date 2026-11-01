import { useCallback, useEffect, useRef, useState } from 'react'
import type { ArticleEditFields } from '../../articleEdits/articleEdit'
import type {
  ReviewFinding,
  ReviewLine,
} from '../../articleReview/reviewContract'
import type { ArticleSlug } from '../../content/articles'
import { failureMessage, streamArticleReview } from './adminClient'

export type ReviewState =
  | { kind: 'idle' }
  | { kind: 'running'; startedAt: number; model?: string }
  | {
      kind: 'done'
      // Identifies this review, so a new one starts with fresh Apply buttons.
      startedAt: number
      model: string
      summary: string
      findings: ReviewFinding[]
    }
  | { kind: 'error'; message: string }

/** One review at a time of the current draft, cancellable, with its result. */
export function useArticleReview(slug: ArticleSlug) {
  const [state, setState] = useState<ReviewState>({ kind: 'idle' })
  const controller = useRef<AbortController | null>(null)

  // Leaving the editor stops a review nobody will read.
  useEffect(() => () => controller.current?.abort(), [])

  const start = useCallback(
    async (article: ArticleEditFields) => {
      if (controller.current) return
      const abort = new AbortController()
      controller.current = abort
      const startedAt = Date.now()
      setState({ kind: 'running', startedAt })
      let finished = false
      const onLine = (line: ReviewLine) => {
        if (line.type === 'started')
          setState((current) =>
            current.kind === 'running'
              ? { ...current, model: line.model }
              : current,
          )
        if (line.type === 'result') {
          finished = true
          const { type: _type, ...result } = line
          setState({ kind: 'done', startedAt, ...result })
        }
        if (line.type === 'error') {
          finished = true
          setState({ kind: 'error', message: line.message })
        }
      }
      try {
        await streamArticleReview(slug, article, onLine, abort.signal)
        if (!finished)
          setState({ kind: 'error', message: 'The review stopped early.' })
      } catch (error) {
        setState(
          abort.signal.aborted
            ? { kind: 'idle' }
            : {
                kind: 'error',
                message: failureMessage(error, 'The review failed.'),
              },
        )
      } finally {
        controller.current = null
      }
    },
    [slug],
  )

  const cancel = useCallback(() => controller.current?.abort(), [])
  const dismiss = useCallback(() => setState({ kind: 'idle' }), [])

  return { state, start, cancel, dismiss }
}
