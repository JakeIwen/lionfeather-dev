import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { TelemetryPreview } from '../../components/projects/TelemetryPreview'
import { projectPath } from '../../routes'
import './project-metadata.css'
import './TelemetryFeature.css'

export function TelemetryFeature() {
  return (
    <Link className="telemetry-feature" to={projectPath('van-telemetry')}>
      <div className="telemetry-feature-copy">
        <p className="eyebrow">AUTOMOTIVE SOFTWARE · 2026</p>
        <h3>Vehicle telemetry</h3>
        <p>
          Discovering CAN bus signals, validating their meaning, and bringing
          gauges, history, and warning evidence to a tablet web app.
        </p>
        <div className="tags">Python · SocketCAN · Preact · SQLite</div>
        <span className="telemetry-feature-link">
          View project <ArrowUpRight size={17} />
        </span>
      </div>
      <TelemetryPreview />
    </Link>
  )
}
