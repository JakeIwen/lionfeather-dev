import { useState } from 'react'
import {
  Check,
  Database,
  Lightbulb,
  RotateCcw,
  ShieldCheck,
  Wifi,
} from 'lucide-react'

const connections = ['Wi-Fi', 'LTE', 'Starlink'] as const

export default function DashboardDemo() {
  const [connection, setConnection] =
    useState<(typeof connections)[number]>('Wi-Fi')
  const [lights, setLights] = useState(true)
  const [brightness, setBrightness] = useState(65)
  const [backup, setBackup] = useState(false)
  const reset = () => {
    setConnection('Wi-Fi')
    setLights(true)
    setBrightness(65)
    setBackup(false)
  }

  return (
    <section className="demo-section" aria-labelledby="demo-title">
      <div className="demo-intro">
        <div>
          <p className="eyebrow">TRY A FEW CONTROLS</p>
          <h2 id="demo-title">A small look inside.</h2>
        </div>
        <span className="demo-badge">Simulated demo</span>
      </div>
      <p className="demo-description">
        An illustrative preview of the control patterns. All values are
        examples; nothing here connects to the van.
      </p>
      <div className="demo-dashboard">
        <div className="demo-top">
          <span>
            <span className="status-dot" /> van / home
          </span>
          <button className="reset-button" onClick={reset}>
            <RotateCcw size={14} /> Reset demo
          </button>
        </div>
        <div className="demo-grid">
          <div className="demo-tile">
            <Wifi />
            <h3>Connection</h3>
            <p aria-live="polite">
              Connected through <strong>{connection}</strong>
            </p>
            <fieldset className="connection-options">
              <legend>Choose a simulated connection</legend>
              {connections.map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={value === connection}
                  onClick={() => setConnection(value)}
                >
                  {value}
                </button>
              ))}
            </fieldset>
            <div className="demo-tile-note">
              <Check size={13} /> Connection available
            </div>
          </div>
          <div className="demo-tile">
            <Lightbulb />
            <div className="light-title">
              <h3>Cabin lighting</h3>
              <button
                className="toggle"
                role="switch"
                aria-checked={lights}
                aria-label="Cabin lights"
                onClick={() => setLights(!lights)}
              >
                <span />
              </button>
            </div>
            <p aria-live="polite">
              {lights ? `Lights on at ${brightness}%` : 'Lights off'}
            </p>
            <label className="brightness-label" htmlFor="brightness">
              Brightness <span>{brightness}%</span>
            </label>
            <input
              id="brightness"
              type="range"
              min="5"
              max="100"
              value={brightness}
              disabled={!lights}
              onChange={(event) => setBrightness(Number(event.target.value))}
            />
          </div>
          <div className="demo-tile">
            <ShieldCheck />
            <h3>Backups</h3>
            <p aria-live="polite">
              {backup
                ? 'Demo backup completed'
                : 'Last example backup: today, 04:00'}
            </p>
            <button
              className="backup-button"
              onClick={() => setBackup(true)}
              disabled={backup}
            >
              {backup ? (
                <>
                  <Check size={14} /> Complete
                </>
              ) : (
                'Simulate a backup'
              )}
            </button>
          </div>
          <div className="demo-tile">
            <Database />
            <h3>Storage</h3>
            <p>Example media volume</p>
            <div className="storage-bar">
              <span />
            </div>
            <div className="storage-label">
              <span>1.2 TB used</span>
              <span>2 TB total</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
