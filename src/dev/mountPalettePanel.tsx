import { createRoot } from 'react-dom/client'
import PalettePanel, { restorePaletteState } from './PalettePanel'
import './palette-panel.css'

const hostId = 'palette-panel-root'
document.getElementById(hostId)?.remove()

const host = document.createElement('div')
host.id = hostId
document.body.append(host)

const panelRoot = createRoot(host)
panelRoot.render(<PalettePanel initialState={restorePaletteState()} />)

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    panelRoot.unmount()
    host.remove()
  })
}
