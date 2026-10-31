import type { MetricsReport } from '../../analytics/analyticsContract'
import { chartGeometry, chartHeight, spreadIndexes } from './chartScale'
import { ChartYAxis } from './ChartYAxis'
import { formatCount, formatDay } from './formatMetrics'
import './DailyChart.css'

type Day = MetricsReport['daily'][number]

// Axis labels at the ends sit inside the plot instead of spilling over its edges.
function labelAnchor(index: number, length: number) {
  if (length === 1) return 'middle'
  if (index === 0) return 'start'
  return index === length - 1 ? 'end' : 'middle'
}

function summaryOf(daily: Day[]): string {
  const peak = daily.reduce((best, day) =>
    day.views > best.views ? day : best,
  )
  const range = `${formatDay(daily[0].day)} to ${formatDay(daily[daily.length - 1].day)}`
  return `Daily views and visitors, ${range}. Busiest day ${formatDay(peak.day)} with ${formatCount(peak.views)} views.`
}

type Props = {
  daily: Day[]
  width: number
  active: number | null
  onActive: (index: number | null) => void
}

export function DailyChartPlot({ daily, width, active, onActive }: Props) {
  const g = chartGeometry(
    daily.length,
    width,
    Math.max(...daily.map((d) => d.views)),
  )
  const labelCount = Math.max(2, Math.floor(g.plotW / 70))
  return (
    <svg
      role="img"
      aria-label={summaryOf(daily)}
      width={width}
      height={chartHeight}
      viewBox={`0 0 ${width} ${chartHeight}`}
      onPointerLeave={(event) => {
        if (event.pointerType === 'mouse') onActive(null)
      }}
    >
      <ChartYAxis g={g} />
      {active === null ? null : (
        <rect
          className="chart-band"
          x={g.slotStart(active)}
          y={g.top}
          width={g.slot}
          height={g.plotH}
        />
      )}
      {daily.map((day, index) => (
        <g key={day.day}>
          <rect
            className="chart-views"
            x={g.centre(index) - g.barW / 2}
            y={g.y(day.views)}
            width={g.barW}
            height={g.baseline - g.y(day.views)}
          />
          <rect
            className="chart-visitors"
            x={g.centre(index) - g.innerW / 2}
            y={g.y(day.visitors)}
            width={g.innerW}
            height={g.baseline - g.y(day.visitors)}
          />
          <rect
            className="chart-hit"
            x={g.slotStart(index)}
            y={g.top}
            width={g.slot}
            height={g.plotH}
            onPointerEnter={() => onActive(index)}
            onPointerDown={() => onActive(index)}
          />
        </g>
      ))}
      {spreadIndexes(daily.length, labelCount).map((index) => (
        <text
          className="chart-axis"
          key={daily[index].day}
          x={g.centre(index)}
          y={chartHeight - 8}
          textAnchor={labelAnchor(index, daily.length)}
        >
          {formatDay(daily[index].day)}
        </text>
      ))}
    </svg>
  )
}
