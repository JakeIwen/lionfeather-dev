import { telemetryScreenshots } from '../../content/screenshots'
import { ScreenshotCarousel } from '../screenshots/ScreenshotCarousel'

export function TelemetryGallery() {
  return (
    <ScreenshotCarousel
      title="Van telemetry"
      id="telemetry"
      images={telemetryScreenshots}
      className="telemetry-gallery"
    />
  )
}
