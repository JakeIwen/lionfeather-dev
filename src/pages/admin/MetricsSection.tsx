import { RefreshCw } from 'lucide-react'
import { useState } from 'react'
import type { MetricsRangeDays } from '../../analytics/analyticsContract'
import { CountMyVisits } from './CountMyVisits'
import { DailyChart } from './DailyChart'
import { formatClock } from './formatMetrics'
import { LiveNow } from './LiveNow'
import { MetricsRangeControl } from './MetricsRangeControl'
import { MetricsTables } from './MetricsTables'
import { MetricsTiles } from './MetricsTiles'
import { useMetrics } from './useMetrics'
import './admin.css'

export function MetricsSection() {
  const [days, setDays] = useState<MetricsRangeDays>(7)
  const { report, error, loading, updatedAt, refresh } = useMetrics(days)
  return (
    <section
      className="admin-section"
      aria-labelledby="metrics-title"
      aria-busy={loading}
    >
      <div className="admin-section-head">
        <h2 id="metrics-title">Metrics</h2>
        <MetricsRangeControl value={days} onChange={setDays} />
        <div className="admin-refresh">
          <button
            type="button"
            className="admin-button"
            onClick={() => void refresh()}
            disabled={loading}
          >
            <RefreshCw size={16} aria-hidden="true" />
            {loading ? 'Refreshing' : 'Refresh'}
          </button>
          {updatedAt ? (
            <span className="admin-note">Updated {formatClock(updatedAt)}</span>
          ) : null}
        </div>
      </div>
      <CountMyVisits />
      {error ? (
        <p className="admin-error" role="alert">
          {error}
        </p>
      ) : null}
      {report ? (
        <div className="admin-stack">
          <LiveNow live={report.live} />
          <MetricsTiles report={report} />
          <DailyChart daily={report.daily} />
          <MetricsTables report={report} />
        </div>
      ) : (
        <p className="admin-note">{loading ? 'Loading metrics…' : ''}</p>
      )}
    </section>
  )
}
