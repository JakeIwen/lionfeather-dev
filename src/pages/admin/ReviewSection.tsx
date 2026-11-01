import { withModel } from '../../articleReview/reviewContract'
import { InfoTip } from './InfoTip'
import { useReviewSettingsDraft } from './useReviewSettingsDraft'
import './admin.css'

const reviewHelp =
  'The Review button in the article editor sends the draft to this model on the review server, which runs on your Claude plan. Higher effort is slower and more thorough.'

/** The model and effort the article Review button uses. */
export function ReviewSection() {
  const {
    catalog,
    catalogError,
    saved,
    draft,
    model,
    dirty,
    status,
    change,
    save,
  } = useReviewSettingsDraft()

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
                if (next) change(withModel(draft, next))
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
              onChange={(event) =>
                change({ ...draft, effort: event.target.value })
              }
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
