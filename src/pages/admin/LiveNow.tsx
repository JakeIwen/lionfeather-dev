import type { MetricsReport } from '../../analytics/analyticsContract'
import { formatCount } from './formatMetrics'
import './metrics-summary.css'

export function LiveNow({ live }: { live: MetricsReport['live'] }) {
  return (
    <div className="live-now">
      <p className="live-now-count">
        <span className="live-now-dot" aria-hidden="true" />
        Live now: {formatCount(live.visitors)}{' '}
        {live.visitors === 1 ? 'visitor' : 'visitors'}
      </p>
      {live.pages.length === 0 ? null : (
        <ul className="live-now-pages" aria-label="Pages open now">
          {live.pages.map((page) => (
            <li key={page.path}>
              {page.path}
              <span className="live-now-visitors">
                {' '}
                × {formatCount(page.visitors)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
