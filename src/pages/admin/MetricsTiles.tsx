import type { MetricsReport } from '../../analytics/analyticsContract'
import { formatCount, formatDuration } from './formatMetrics'
import { InfoTip } from './InfoTip'
import './metrics-summary.css'

type Tile = { label: string; value: string; tip?: string }

function tilesOf({ totals }: MetricsReport): Tile[] {
  return [
    { label: 'Views', value: formatCount(totals.views) },
    {
      label: 'Daily visitors (summed)',
      value: formatCount(totals.visitorDays),
      tip: 'Visitors are counted once per UTC day from a hash that changes every day, so nobody can be followed from one day to the next. Someone who returns on three days counts three times: this is visitor-days, not unique people.',
    },
    {
      label: 'Engaged time',
      value: formatDuration(totals.engagedSeconds),
      tip: 'Total seconds the page was visible and in use, across all views.',
    },
    {
      label: 'Avg engaged per view',
      value: formatDuration(totals.avgEngagedSeconds),
      tip: 'Engaged time divided by all views, including views with none.',
    },
    { label: 'Resume opens', value: formatCount(totals.resumeOpens) },
    { label: 'Outbound clicks', value: formatCount(totals.outboundClicks) },
  ]
}

export function MetricsTiles({ report }: { report: MetricsReport }) {
  return (
    <dl className="metric-tiles">
      {tilesOf(report).map((tile) => (
        <div className="metric-tile" key={tile.label}>
          <dt>
            {tile.label}
            {tile.tip ? (
              <InfoTip label={`About ${tile.label}`}>{tile.tip}</InfoTip>
            ) : null}
          </dt>
          <dd>{tile.value}</dd>
        </div>
      ))}
    </dl>
  )
}
