import { useEffect, useState } from 'react'
import type {
  ReviewCatalog,
  ReviewSettings,
} from '../../articleReview/reviewContract'
import {
  failureMessage,
  getReviewCatalog,
  getReviewSettings,
  saveReviewSettings,
} from './adminClient'

/**
 * The saved review settings, an editable draft, the model catalog from the
 * review service, and saving. The catalog and settings load independently, so
 * the saved choice still shows when the service is down.
 */
export function useReviewSettingsDraft() {
  const [catalog, setCatalog] = useState<ReviewCatalog>()
  const [saved, setSaved] = useState<ReviewSettings>()
  const [draft, setDraft] = useState<ReviewSettings>()
  const [catalogError, setCatalogError] = useState('')
  const [status, setStatus] = useState('')

  useEffect(() => {
    let current = true
    getReviewSettings().then(
      (settings) => {
        if (!current) return
        setSaved(settings)
        setDraft(settings)
      },
      (error) => current && setStatus(failureMessage(error, 'Not loaded.')),
    )
    getReviewCatalog().then(
      (models) => current && setCatalog(models),
      (error) =>
        current &&
        setCatalogError(failureMessage(error, 'The model list did not load.')),
    )
    return () => {
      current = false
    }
  }, [])

  const model = catalog?.models.find((entry) => entry.id === draft?.model)
  const dirty =
    draft !== undefined &&
    (draft.model !== saved?.model || draft.effort !== saved?.effort)

  function change(next: ReviewSettings) {
    setDraft(next)
    setStatus('')
  }

  async function save() {
    if (!draft) return
    setStatus('Saving…')
    try {
      const next = await saveReviewSettings(draft)
      setSaved(next)
      setDraft(next)
      setStatus('Saved.')
    } catch (error) {
      setStatus(`Not saved. ${failureMessage(error, 'The save failed.')}`)
    }
  }

  return {
    catalog,
    catalogError,
    saved,
    draft,
    model,
    dirty,
    status,
    change,
    save,
  }
}
