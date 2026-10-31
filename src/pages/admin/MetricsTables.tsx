import type { CountRow, MetricsReport } from '../../analytics/analyticsContract'
import { DataTable, type Column } from './DataTable'
import {
  capitalize,
  countryLabel,
  eventLabel,
  formatCount,
  formatDuration,
  formatTimestamp,
} from './formatMetrics'
import './MetricsTables.css'

type Page = MetricsReport['pages'][number]
type Recent = MetricsReport['recent'][number]
// An event total, or one of its targets (indented under it).
type EventRow = {
  id: string
  label: string
  target: boolean
  visitors?: number
  count: number
}

const pageColumns: Column<Page>[] = [
  { header: 'Page', cell: (page) => page.path },
  { header: 'Views', numeric: true, cell: (page) => formatCount(page.views) },
  {
    header: 'Visitors',
    numeric: true,
    cell: (page) => formatCount(page.visitors),
  },
  {
    header: 'Avg engaged',
    numeric: true,
    cell: (page) => formatDuration(page.avgEngagedSeconds),
  },
]

// Referrer, country, device and browser rows count views.
const countColumns = (
  header: string,
  label: (key: string) => string = (key) => key,
): Column<CountRow>[] => [
  { header, cell: (row) => label(row.key) },
  { header: 'Views', numeric: true, cell: (row) => formatCount(row.count) },
  {
    header: 'Visitors',
    numeric: true,
    cell: (row) => formatCount(row.visitors),
  },
]

const eventColumns: Column<EventRow>[] = [
  {
    header: 'Event',
    cell: (row) =>
      row.target ? (
        <span className="event-target">{row.label}</span>
      ) : (
        row.label
      ),
  },
  { header: 'Count', numeric: true, cell: (row) => formatCount(row.count) },
  {
    header: 'Visitors',
    numeric: true,
    cell: (row) =>
      row.visitors === undefined ? '' : formatCount(row.visitors),
  },
]

const recentColumns: Column<Recent>[] = [
  { header: 'Page', cell: (view) => view.path },
  { header: 'When', cell: (view) => formatTimestamp(view.ts) },
  { header: 'Country', cell: (view) => countryLabel(view.country) },
  { header: 'Device', cell: (view) => capitalize(view.device) },
  { header: 'From', cell: (view) => view.referrer ?? 'direct' },
]

function eventRows(report: MetricsReport): EventRow[] {
  return report.events.flatMap((event) => [
    {
      id: event.key,
      label: eventLabel(event.key),
      target: false,
      visitors: event.visitors,
      count: event.count,
    },
    ...report.eventTargets
      .filter((target) => target.name === event.key)
      .map((target) => ({
        id: `${event.key}\0${target.target}`,
        label: target.target || '(none)',
        target: true,
        count: target.count,
      })),
  ])
}

export function MetricsTables({ report }: { report: MetricsReport }) {
  return (
    <div className="metrics-tables">
      <DataTable
        className="metrics-table-wide"
        title="Pages"
        columns={pageColumns}
        rows={report.pages}
        rowKey={(page) => page.path}
      />
      <DataTable
        title="Referrers"
        columns={countColumns('Source')}
        rows={report.referrers}
        rowKey={(row) => row.key}
      />
      <DataTable
        title="Countries"
        columns={countColumns('Country', (key) => countryLabel(key))}
        rows={report.countries}
        rowKey={(row) => row.key}
      />
      <DataTable
        title="Devices"
        columns={countColumns('Device', capitalize)}
        rows={report.devices}
        rowKey={(row) => row.key}
      />
      <DataTable
        title="Browsers"
        columns={countColumns('Browser')}
        rows={report.browsers}
        rowKey={(row) => row.key}
      />
      <DataTable
        className="metrics-table-wide"
        title="Events"
        columns={eventColumns}
        rows={eventRows(report)}
        rowKey={(row) => row.id}
        emptyText="No events yet"
      />
      <DataTable
        className="metrics-table-wide"
        title="Recent views"
        columns={recentColumns}
        rows={report.recent}
        rowKey={(view, index) => `${view.ts}-${index}`}
      />
    </div>
  )
}
