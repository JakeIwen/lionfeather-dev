import { useId } from 'react'
import { Switch } from './Switch'
import { useExcludeBrowser } from './useExcludeBrowser'
import './admin.css'

export function CountMyVisits() {
  const noteId = useId()
  const { counted, setCounted, autoExcluded } = useExcludeBrowser()
  return (
    <div className="count-visits">
      <Switch
        label="Count my visits"
        checked={counted}
        onChange={setCounted}
        describedBy={noteId}
      />
      <p className="admin-note" id={noteId}>
        {counted
          ? 'Page views from this browser are included in the numbers below.'
          : 'Page views from this browser are not counted.'}
        {autoExcluded && !counted
          ? ' This turned on by itself the first time you opened Admin here.'
          : ''}
      </p>
    </div>
  )
}
