import { useCallback, useEffect, useRef, useState } from 'react'
import {
  articleEditFieldsOf,
  articleEditProblem,
  type ArticleEdit,
  type ArticleEditFields,
} from '../../articleEdits/articleEdit'
import { replaceArticleEdit } from '../../articleEdits/currentArticles'
import type { Article } from '../../content/articles'
import {
  deleteArticleEdit,
  failureMessage,
  getArticleEdits,
  saveArticleEdit,
} from './adminClient'
import type { SaveStatus } from './useSiteSettingsDraft'

// Tags are typed as one comma-separated line.
export type ArticleDraft = Omit<ArticleEditFields, 'tags'> & { tags: string }

const draftOf = (fields: ArticleEditFields): ArticleDraft => ({
  ...fields,
  tags: fields.tags.join(', '),
})

export const draftFields = (draft: ArticleDraft): ArticleEditFields => ({
  ...draft,
  tags: draft.tags
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean),
})

const idle: SaveStatus = { kind: 'idle', text: '' }

const sameDraft = (a: ArticleDraft, b: ArticleDraft) =>
  JSON.stringify(a) === JSON.stringify(b)

/**
 * The article as saved (the owner's site edit, or the code's version when
 * there is none), an editable draft of it, and save, revert and discard.
 */
export function useArticleDraft(article: Article) {
  const { slug } = article
  const [edit, setEdit] = useState<ArticleEdit | null>()
  const [base, setBase] = useState<ArticleDraft>()
  const [draft, setDraft] = useState<ArticleDraft>()
  const [loadError, setLoadError] = useState('')
  const [status, setStatus] = useState<SaveStatus>(idle)
  const busy = useRef(false)
  const dirty =
    base !== undefined && draft !== undefined && !sameDraft(base, draft)

  // The code's version, before any site edit is laid over it.
  const [codeFields] = useState(() => articleEditFieldsOf(article))

  useEffect(() => {
    let current = true
    getArticleEdits().then(
      (edits) => {
        if (!current) return
        const saved = edits[slug] ?? null
        const start = draftOf(saved ?? codeFields)
        setEdit(saved)
        setBase(start)
        setDraft(start)
      },
      (error) => {
        if (current)
          setLoadError(failureMessage(error, 'The article did not load.'))
      },
    )
    return () => {
      current = false
    }
  }, [slug, codeFields])

  // Leaving with unsaved changes would silently drop them.
  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  const change = useCallback((patch: Partial<ArticleDraft>) => {
    setDraft((current) => (current ? { ...current, ...patch } : current))
    setStatus((current) => (current.kind === 'saving' ? current : idle))
  }, [])

  const revert = useCallback(() => {
    setDraft(base)
    setStatus(idle)
  }, [base])

  /** Runs one write at a time; a click while one is pending does nothing. */
  const run = useCallback(
    async (pending: string, write: () => Promise<string>) => {
      if (busy.current) return
      busy.current = true
      setStatus({ kind: 'saving', text: pending })
      try {
        setStatus({ kind: 'saved', text: await write() })
      } catch (error) {
        setStatus({
          kind: 'error',
          text: `Not saved. ${failureMessage(error, 'The save failed.')}`,
        })
      } finally {
        busy.current = false
      }
    },
    [],
  )

  const save = useCallback(async () => {
    if (!draft) return
    const fields = draftFields(draft)
    const problem = articleEditProblem(fields)
    if (problem) {
      setStatus({ kind: 'error', text: `Not saved. ${problem}` })
      return
    }
    await run('Saving…', async () => {
      const saved = await saveArticleEdit(slug, fields)
      const next = draftOf(saved)
      setEdit(saved)
      setBase(next)
      // Typing done while the save was pending stays in the draft.
      setDraft((current) =>
        current && sameDraft(current, draft) ? next : current,
      )
      replaceArticleEdit(slug, saved)
      return 'Saved. Visitors see it within 10 seconds.'
    })
  }, [draft, run, slug])

  const discard = useCallback(async () => {
    await run('Restoring…', async () => {
      await deleteArticleEdit(slug)
      const start = draftOf(codeFields)
      setEdit(null)
      setBase(start)
      setDraft(start)
      replaceArticleEdit(slug)
      return 'Restored the version in the code.'
    })
  }, [codeFields, run, slug])

  return {
    edit,
    draft,
    dirty,
    loadError,
    status,
    change,
    revert,
    save,
    discard,
  }
}
