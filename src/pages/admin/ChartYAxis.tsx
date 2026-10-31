import type { ChartGeometry } from './chartScale'
import { formatCount } from './formatMetrics'
import './DailyChart.css'

/** Horizontal gridlines with their value labels. */
export function ChartYAxis({ g }: { g: ChartGeometry }) {
  return g.ticks.map((tick) => (
    <g key={tick}>
      <line
        className="chart-grid"
        x1={g.left}
        x2={g.right}
        y1={g.y(tick)}
        y2={g.y(tick)}
      />
      <text
        className="chart-axis"
        x={g.left - 8}
        y={g.y(tick)}
        textAnchor="end"
        dominantBaseline="middle"
      >
        {formatCount(tick)}
      </text>
    </g>
  ))
}
