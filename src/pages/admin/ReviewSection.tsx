import { useEffect, useState } from 'react'
import type {
  ReviewCatalog,
  ReviewSettings,
} from '../../articleReview/reviewContract'
import {
  getReviewCatalog,
  getReviewSettings,
  saveReviewSettings,
} from './adminClient'
import { InfoTip } from './InfoTip'
import './admin.css'

const messageOf = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback

const reviewHelp =
  'The Review button in the article editor sends the draft to this model on the review server, which runs on your Claude plan. Higher effort is slower and more thorough.'

/** The model and effort the article Review button uses. */
export function ReviewSection() {
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
      (error) => current && setStatus(messageOf(error, 'Not loaded.')),
    )
    getReviewCatalog().then(
      (models) => current && setCatalog(models),
      (error) =>
        current &&
        setCatalogError(messageOf(error, 'The model list did not load.')),
    )
    return () => {
      current = false
    }
  }, [])

  const model = catalog?.models.find((entry) => entry.id === draft?.model)
  const dirty =
    draft !== undefined &&
    (draft.model !== saved?.model || draft.effort !== saved?.effort)

  async function save() {
    if (!draft) return
    setStatus('Saving…')
    try {
      const next = await saveReviewSettings(draft)
      setSaved(next)
      setDraft(next)
      setStatus('Saved.')
    } catch (error) {
      setStatus(`Not saved. ${messageOf(error, 'The save failed.')}`)
    }
  }

  return (
    <section className="admin-section" aria-labelledby="review-title">
      <div className="admin-section-head">
        <h2 id="review-title">
          Article review{' '}
          <InfoTip label="About article review">{reviewHelp}</InfoTip>
        </h2>
      </div>
      {catalogError ? (
        <p className="admin-error" role="alert">
          {catalogError}
          {saved
            ? ` Saved choice: ${saved.model}, ${saved.effort} effort.`
            : ''}
        </p>
      ) : null}
      {catalog && draft ? (
        <div className="admin-stack">
          <label className="admin-field">
            <span>Model</span>
            <select
              className="admin-select"
              value={draft.model}
              onChange={(event) => {
                const next = catalog.models.find(
                  (entry) => entry.id === event.target.value,
                )
                if (!next) return
                const effort = next.efforts.includes(draft.effort)
                  ? draft.effort
                  : (next.efforts.at(-1) ?? draft.effort)
                setDraft({ model: next.id, effort })
                setStatus('')
              }}
            >
              {model ? null : (
                <option value={draft.model}>{draft.model}</option>
              )}
              {catalog.models.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.label}
                </option>
              ))}
            </select>
          </label>
          <label className="admin-field">
            <span>Effort</span>
            <select
              className="admin-select"
              value={draft.effort}
              onChange={(event) => {
                setDraft({ ...draft, effort: event.target.value })
                setStatus('')
              }}
            >
              {(model?.efforts ?? [draft.effort]).map((effort) => (
                <option key={effort} value={effort}>
                  {effort}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : catalogError ? null : (
        <p className="admin-note">Loading models…</p>
      )}
      <div className="admin-actions">
        <button
          type="button"
          className="admin-button admin-button-primary"
          disabled={!dirty || !model}
          onClick={() => void save()}
        >
          Save
        </button>
        <p role="status" className="admin-status">
          {status || (dirty ? 'Unsaved changes.' : '')}
        </p>
      </div>
    </section>
  )
}
