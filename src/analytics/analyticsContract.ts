// What the page sends to the Worker's collect endpoint and what the admin
// metrics endpoint returns. Shared by the browser beacon, the Worker and the
// admin dashboard; the Worker validates every field it stores.

export const analyticsEventNames = [
  // Resume PDF link clicked.
  'resume',
  // A link to another site clicked; target is its host.
  'outbound',
  // A mailto link clicked.
  'email',
  // The contact section's Copy email button.
  'copy-email',
  // A screenshot opened in the full-screen viewer; target is its image path.
  'screenshot',
] as const
export type AnalyticsEventName = (typeof analyticsEventNames)[number]

export type CollectPayload =
  // A route shown. referrer is the external host on the landing view only;
  // source is a utm_source or ref parameter from the landing URL.
  | { kind: 'view'; path: string; referrer?: string; source?: string }
  // Visible time on path since the last engage for it, sent every minute while
  // visible and when the route changes or the page hides.
  | { kind: 'engage'; path: string; ms: number }
  | { kind: 'event'; path: string; name: AnalyticsEventName; target?: string }

export const collectLimits = {
  bodyBytes: 2048,
  path: 200,
  target: 200,
  referrer: 120,
  source: 60,
  // One engage covers at most a heartbeat interval plus slack.
  engageMs: 5 * 60 * 1000,
} as const

export const heartbeatMs = 60 * 1000
// A visitor counts as on the site now if anything arrived this recently.
export const liveWindowMs = 5 * 60 * 1000

export const metricsRangeDays = [1, 7, 30, 90] as const
export type MetricsRangeDays = (typeof metricsRangeDays)[number]

export type CountRow = { key: string; visitors: number; count: number }

export type MetricsReport = {
  // ISO dates, UTC, inclusive.
  range: { days: MetricsRangeDays; from: string; to: string }
  totals: {
    views: number
    // Distinct visitors per UTC day, summed: hashes rotate daily, so the same
    // person on two days counts twice.
    visitorDays: number
    engagedSeconds: number
    // Engaged seconds divided by all views in the range.
    avgEngagedSeconds: number
    resumeOpens: number
    outboundClicks: number
  }
  daily: { day: string; views: number; visitors: number }[]
  // key: route path, ordered by views. avgEngagedSeconds over all its views.
  pages: {
    path: string
    views: number
    visitors: number
    avgEngagedSeconds: number
  }[]
  // key: referrer host, source parameter, or 'direct'.
  referrers: CountRow[]
  // key: ISO 3166 alpha-2 country, or 'unknown'.
  countries: CountRow[]
  // key: 'desktop' | 'mobile' | 'tablet'.
  devices: CountRow[]
  browsers: CountRow[]
  // key: event name; target rows are in eventTargets.
  events: CountRow[]
  eventTargets: { name: AnalyticsEventName; target: string; count: number }[]
  live: {
    visitors: number
    pages: { path: string; visitors: number }[]
  }
  // Newest first, at most 30 views.
  recent: {
    ts: number
    path: string
    country: string | null
    device: string
    referrer: string | null
  }[]
}

// localStorage flag that keeps this browser's visits out of the metrics. The
// admin page sets it; the beacon checks it before every send.
export const excludeBrowserKey = 'lionfeather-analytics-exclude-v1'
