import ScreenshotCarousel from './ScreenshotCarousel'
import type { Screenshot } from './ScreenshotCarousel'

const path = '/images/van-telemetry/'
const screens: Screenshot[] = [
  {
    id: 'drive',
    label: 'Driving gauges',
    src: `${path}drive.png`,
    width: 800,
    height: 1280,
    context: 'Portrait tablet gauges · Illustrative demo telemetry',
    alt: 'Van telemetry driving view with large speed and RPM gauges, temperatures, oil pressure, voltage, power, tires, and trip information. Illustrative demo data.',
  },
  {
    id: 'parked',
    label: 'Parked overview',
    src: `${path}parked.png`,
    width: 800,
    height: 1280,
    context:
      'Battery, tires, and service history · Illustrative demo telemetry',
    alt: 'Parked telemetry view showing battery voltage and trend, tire pressures, service records, and a warning summary. Illustrative demo data.',
  },
  {
    id: 'evidence',
    label: 'Warning evidence',
    src: `${path}warning-evidence.png`,
    width: 800,
    height: 1280,
    context:
      'Saved readings and event timeline · Illustrative warning scenario',
    alt: 'A warning detail view preserves opening readings, a comparison baseline, a chart, and an event timeline. Illustrative slow-leak scenario.',
  },
  {
    id: 'history',
    label: 'Trip history',
    src: `${path}history.png`,
    width: 800,
    height: 1280,
    context: 'Trips and temperature trends · Illustrative demo history',
    alt: 'Trip summaries and temperature charts in the telemetry history view. The trip statistics and plotted readings are illustrative demo data.',
  },
  {
    id: 'catalog',
    label: 'Metric sources',
    src: `${path}metric-catalog.png`,
    width: 800,
    height: 1280,
    context:
      'Source, quality, and freshness policies · Illustrative metric values',
    alt: 'The telemetry metric catalog shows data sources, quality labels, and freshness policies alongside illustrative readings.',
  },
  {
    id: 'warnings',
    label: 'Warning review',
    src: `${path}custom-warning.png`,
    width: 800,
    height: 1280,
    context:
      'Custom warning proposal · Simulated conversation; no rule installed',
    alt: 'A simulated Codex conversation proposes an early-warning rule with settings for the owner to review and approve. No vehicle action or warning installation occurred.',
  },
]

export function TelemetryPreview() {
  return (
    <div className="telemetry-preview">
      <div className="telemetry-tablets">
        <img
          src={screens[0]!.src}
          alt={screens[0]!.alt}
          width={800}
          height={1280}
          loading="lazy"
        />
        <img
          src={screens[3]!.src}
          alt={screens[3]!.alt}
          width={800}
          height={1280}
          loading="lazy"
        />
      </div>
      <p>Illustrative demo telemetry</p>
    </div>
  )
}

export function TelemetryGallery() {
  return (
    <ScreenshotCarousel
      title="Van telemetry"
      id="telemetry"
      images={screens}
      className="telemetry-gallery"
    />
  )
}

export function SignalDiscovery() {
  return (
    <aside className="signal-discovery" aria-label="Signal discovery workflow">
      <p className="eyebrow">FROM A RAW FRAME TO A USABLE READING</p>
      <ol>
        <li>
          <strong>Observe</strong>
          <p>Capture bus traffic alongside known diagnostic readings.</p>
        </li>
        <li>
          <strong>Match</strong>
          <p>Align timestamps, then test bit layouts, scale, and offset.</p>
        </li>
        <li>
          <strong>Challenge</strong>
          <p>Test independent drives and competing interpretations.</p>
        </li>
        <li>
          <strong>Publish</strong>
          <p>Retain the source, confidence, and freshness of each metric.</p>
        </li>
      </ol>
    </aside>
  )
}
