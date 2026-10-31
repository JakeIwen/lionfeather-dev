// The owner's metrics report. Every figure is aggregated in SQL; the Worker
// only shapes the rows. Visitor ids rotate daily, so a "visitor" is counted
// per UTC day (day || visitor) wherever it is summed across days.
import {
  liveWindowMs,
  type AnalyticsEventName,
  type CountRow,
  type MetricsRangeDays,
  type MetricsReport,
} from '../src/analytics/analyticsContract'
import { addDays, daysBetween, utcDay } from './utcDays'

const topRows = 20
const topTargets = 30
const recentViews = 30
const visitorDay = "day || '|' || visitor"

// Parameters: ?1 first day, ?2 last day.
const inRange = 'day BETWEEN ?1 AND ?2'

type Db = D1Database

const round1 = (value: number) => Math.round(value * 10) / 10

/** Views grouped by one of the events columns, most common first. */
const breakdown = (
  db: Db,
  column: 'country' | 'device' | 'browser',
  from: string,
  to: string,
) =>
  db
    .prepare(
      `SELECT COALESCE(NULLIF(${column}, ''), 'unknown') AS key,
              COUNT(DISTINCT ${visitorDay}) AS visitors, COUNT(*) AS count
       FROM events WHERE kind = 'view' AND ${inRange}
       GROUP BY key ORDER BY count DESC, key LIMIT ${topRows}`,
    )
    .bind(from, to)

// Referrer/source/direct per view. Only a visit's landing view carries a
// referrer or source, so a view with neither counts as direct only when it is
// the visitor's first of the day; later ones are in-site navigation.
const referrers = (db: Db, from: string, to: string) =>
  db
    .prepare(
      `SELECT key, COUNT(DISTINCT ${visitorDay}) AS visitors, COUNT(*) AS count
       FROM (
         SELECT day, visitor,
                COALESCE(NULLIF(source, ''), NULLIF(referrer, ''),
                         CASE WHEN rank = 1 THEN 'direct' END) AS key
         FROM (
           SELECT day, visitor, source, referrer,
                  ROW_NUMBER() OVER (PARTITION BY day, visitor ORDER BY ts, id) AS rank
           FROM events WHERE kind = 'view' AND ${inRange}
         )
       )
       WHERE key IS NOT NULL
       GROUP BY key ORDER BY count DESC, key LIMIT ${topRows}`,
    )
    .bind(from, to)

// Engagement carries no view id (visitors carry no client ids), so averages
// divide the engaged time by every view, engaged or not.
const engagedByPath = `SELECT path, SUM(engaged_ms) AS ms
  FROM events WHERE kind = 'engage' AND ${inRange}
  GROUP BY path`

const pages = (db: Db, from: string, to: string) =>
  db
    .prepare(
      `SELECT v.path, v.views, v.visitors,
              COALESCE(e.ms, 0) AS engagedMs
       FROM (
         SELECT path, COUNT(*) AS views, COUNT(DISTINCT ${visitorDay}) AS visitors
         FROM events WHERE kind = 'view' AND ${inRange}
         GROUP BY path ORDER BY views DESC, path LIMIT ${topRows}
       ) v
       LEFT JOIN (${engagedByPath}) e ON e.path = v.path
       ORDER BY v.views DESC, v.path`,
    )
    .bind(from, to)

const engagementTotals = (db: Db, from: string, to: string) =>
  db
    .prepare(
      `SELECT COALESCE(SUM(engaged_ms), 0) AS ms
       FROM events WHERE kind = 'engage' AND ${inRange}`,
    )
    .bind(from, to)

const daily = (db: Db, from: string, to: string) =>
  db
    .prepare(
      `SELECT day, COUNT(*) AS views, COUNT(DISTINCT visitor) AS visitors
       FROM events WHERE kind = 'view' AND ${inRange} GROUP BY day`,
    )
    .bind(from, to)

const eventNames = (db: Db, from: string, to: string) =>
  db
    .prepare(
      `SELECT name AS key, COUNT(DISTINCT ${visitorDay}) AS visitors, COUNT(*) AS count
       FROM events WHERE kind = 'event' AND ${inRange}
       GROUP BY name ORDER BY count DESC, name`,
    )
    .bind(from, to)

const eventTargets = (db: Db, from: string, to: string) =>
  db
    .prepare(
      `SELECT name, target, COUNT(*) AS count
       FROM events WHERE kind = 'event' AND target IS NOT NULL AND ${inRange}
       GROUP BY name, target ORDER BY count DESC, name, target LIMIT ${topTargets}`,
    )
    .bind(from, to)

// Each recent visitor's latest path, across every event kind.
const livePaths = (db: Db, since: number) =>
  db
    .prepare(
      `SELECT path, COUNT(*) AS visitors FROM (
         SELECT path, ROW_NUMBER() OVER (PARTITION BY visitor ORDER BY ts DESC, id DESC) AS rank
         FROM events WHERE ts >= ?1
       ) WHERE rank = 1
       GROUP BY path ORDER BY visitors DESC, path`,
    )
    .bind(since)

const recent = (db: Db) =>
  db.prepare(
    `SELECT ts, path, country, device, referrer FROM events
       WHERE kind = 'view' ORDER BY ts DESC, id DESC LIMIT ${recentViews}`,
  )

type DailyRow = { day: string; views: number; visitors: number }
type PageRow = {
  path: string
  views: number
  visitors: number
  engagedMs: number
}
type EngagementRow = { ms: number }
type LiveRow = { path: string; visitors: number }

const rows = <Row>(result: D1Result): Row[] => result.results as Row[]

async function queryRows(db: Db, from: string, to: string, now: number) {
  const [
    daily_,
    engagement,
    pages_,
    referrers_,
    countries,
    devices,
    browsers,
    events,
    targets,
    live,
    recent_,
  ] = await db.batch([
    daily(db, from, to),
    engagementTotals(db, from, to),
    pages(db, from, to),
    referrers(db, from, to),
    breakdown(db, 'country', from, to),
    breakdown(db, 'device', from, to),
    breakdown(db, 'browser', from, to),
    eventNames(db, from, to),
    eventTargets(db, from, to),
    livePaths(db, now - liveWindowMs),
    recent(db),
  ])
  return {
    daily: rows<DailyRow>(daily_),
    engagement: rows<EngagementRow>(engagement)[0],
    pages: rows<PageRow>(pages_),
    referrers: rows<CountRow>(referrers_),
    countries: rows<CountRow>(countries),
    devices: rows<CountRow>(devices),
    browsers: rows<CountRow>(browsers),
    events: rows<CountRow>(events),
    targets: rows<MetricsReport['eventTargets'][number]>(targets),
    live: rows<LiveRow>(live),
    recent: rows<MetricsReport['recent'][number]>(recent_),
  }
}

const perView = (ms: number, views: number) =>
  views ? round1(ms / 1000 / views) : 0
const sum = <Row>(items: Row[], pick: (item: Row) => number) =>
  items.reduce((total, item) => total + pick(item), 0)

/** The last `days` UTC days up to and including today. */
export async function buildMetricsReport(
  db: Db,
  days: MetricsRangeDays,
  now: number,
): Promise<MetricsReport> {
  const to = utcDay(now)
  const from = addDays(to, -(days - 1))
  const data = await queryRows(db, from, to, now)

  const byDay = new Map(data.daily.map((row) => [row.day, row]))
  const daily = daysBetween(from, to).map((day) => ({
    day,
    views: byDay.get(day)?.views ?? 0,
    visitors: byDay.get(day)?.visitors ?? 0,
  }))
  const eventCount = (name: AnalyticsEventName) =>
    data.events.find((row) => row.key === name)?.count ?? 0

  return {
    range: { days, from, to },
    totals: {
      views: sum(daily, (row) => row.views),
      visitorDays: sum(daily, (row) => row.visitors),
      engagedSeconds: Math.round(data.engagement.ms / 1000),
      avgEngagedSeconds: perView(
        data.engagement.ms,
        sum(daily, (row) => row.views),
      ),
      resumeOpens: eventCount('resume'),
      outboundClicks: eventCount('outbound'),
    },
    daily,
    pages: data.pages.map((row) => ({
      path: row.path,
      views: row.views,
      visitors: row.visitors,
      avgEngagedSeconds: perView(row.engagedMs, row.views),
    })),
    referrers: data.referrers,
    countries: data.countries,
    devices: data.devices,
    browsers: data.browsers,
    events: data.events,
    eventTargets: data.targets,
    live: { visitors: sum(data.live, (row) => row.visitors), pages: data.live },
    recent: data.recent,
  }
}
