import type { SaveStatus } from './useSiteSettingsDraft'
import './admin.css'

/** Save and Revert, enabled only when the draft differs from what is saved, and the result of the last save. */
export function SettingsActions({
  dirty,
  status,
  onSave,
  onRevert,
}: {
  dirty: boolean
  status: SaveStatus
  onSave: () => void
  onRevert: () => void
}) {
  const busy = status.kind === 'saving'
  const text = status.text || (dirty ? 'Unsaved changes.' : '')
  return (
    <div className="admin-actions admin-actions-sticky">
      <button
        type="button"
        className="admin-button admin-button-primary"
        onClick={onSave}
        disabled={!dirty || busy}
      >
        Save
      </button>
      <button
        type="button"
        className="admin-button"
        onClick={onRevert}
        disabled={!dirty || busy}
      >
        Revert
      </button>
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
