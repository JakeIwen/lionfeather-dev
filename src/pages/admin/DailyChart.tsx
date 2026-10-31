import { useState } from 'react'
import type { MetricsReport } from '../../analytics/analyticsContract'
import { DailyChartPlot } from './DailyChartPlot'
import { DailyTable } from './DailyTable'
import { formatCount, formatDay } from './formatMetrics'
import { useElementWidth } from './useElementWidth'
import './DailyChart.css'

type Day = MetricsReport['daily'][number]

const minWidth = 280

const dayText = (day: Day) =>
  `${formatDay(day.day)}: ${formatCount(day.views)} views, ${formatCount(day.visitors)} visitors`

/** Daily views (wide bars) with that day's visitors (narrow bars) inside them. */
export function DailyChart({ daily }: { daily: Day[] }) {
  const [frame, measured] = useElementWidth<HTMLDivElement>()
  const [active, setActive] = useState<number | null>(null)
  const peak = daily.reduce<Day | null>(
    (best, day) => (best && best.views >= day.views ? best : day),
    null,
  )
  const hovered = active === null ? undefined : daily[active]
  // A range of all-zero days has nothing to draw; say so like the tables do.
  const hasVisits = daily.some((day) => day.views > 0)

  return (
    <div className="daily-chart">
      <ul className="chart-legend" aria-label="Legend">
        <li>
          <span
            className="chart-swatch chart-swatch-views"
            aria-hidden="true"
          />
          Views
        </li>
        <li>
          <span
            className="chart-swatch chart-swatch-visitors"
            aria-hidden="true"
          />
          Visitors that day
        </li>
      </ul>
      {peak && hasVisits ? (
        <p className="chart-readout" aria-hidden="true">
          {hovered ? dayText(hovered) : `Busiest day, ${dayText(peak)}`}
        </p>
      ) : null}
      <div className="chart-frame" ref={frame}>
        {!hasVisits ? (
          <p className="chart-empty">No visits yet</p>
        ) : (
          <DailyChartPlot
            daily={daily}
            width={Math.max(measured, minWidth)}
            active={active}
            onActive={setActive}
          />
        )}
      </div>
      {hasVisits ? <DailyTable daily={daily} /> : null}
    </div>
  )
}
