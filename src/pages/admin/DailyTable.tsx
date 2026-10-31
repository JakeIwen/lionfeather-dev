import type { MetricsReport } from '../../analytics/analyticsContract'
import { formatCount, formatDay } from './formatMetrics'
import './DailyChart.css'

/** The chart's numbers as a table, for screen readers and anyone who wants exact values. */
export function DailyTable({ daily }: { daily: MetricsReport['daily'] }) {
  return (
    <details className="chart-table">
      <summary>Daily numbers</summary>
      <table>
        <thead>
          <tr>
            <th scope="col">Day</th>
            <th scope="col">Views</th>
            <th scope="col">Visitors</th>
          </tr>
        </thead>
        <tbody>
          {daily.map((day) => (
            <tr key={day.day}>
              <th scope="row">{formatDay(day.day)}</th>
              <td>{formatCount(day.views)}</td>
              <td>{formatCount(day.visitors)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  )
}
