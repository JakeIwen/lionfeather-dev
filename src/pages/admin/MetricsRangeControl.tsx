import {
  metricsRangeDays,
  type MetricsRangeDays,
} from '../../analytics/analyticsContract'
import './MetricsRangeControl.css'

const rangeLabels: Record<MetricsRangeDays, string> = {
  1: 'Today',
  7: '7 days',
  30: '30 days',
  90: '90 days',
}

export function MetricsRangeControl({
  value,
  onChange,
}: {
  value: MetricsRangeDays
  onChange: (days: MetricsRangeDays) => void
}) {
  return (
    <div className="range-control" role="group" aria-label="Date range">
      {metricsRangeDays.map((days) => (
        <button
          key={days}
          type="button"
          aria-pressed={value === days}
          onClick={() => onChange(days)}
        >
          {rangeLabels[days]}
        </button>
      ))}
    </div>
  )
}
