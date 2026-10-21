import { telemetryScreenshots } from '../../content/screenshots'
import './TelemetryPreview.css'

export function TelemetryPreview() {
  return (
    <div className="telemetry-preview">
      <div className="telemetry-tablets">
        <img
          src={telemetryScreenshots[0]!.src}
          alt={telemetryScreenshots[0]!.alt}
          width={800}
          height={1280}
          loading="lazy"
        />
        <img
          src={telemetryScreenshots[3]!.src}
          alt={telemetryScreenshots[3]!.alt}
          width={800}
          height={1280}
          loading="lazy"
        />
      </div>
      <p>Illustrative demo telemetry</p>
    </div>
  )
}
