import type { AnalyticsEventName } from '../../analytics/analyticsContract'

const numberFormat = new Intl.NumberFormat('en-US')
export const formatCount = (value: number) => numberFormat.format(value)

/** 83 -> "1m 23s". Whole seconds; under a minute drops the minutes. */
export function formatDuration(seconds: number): string {
  const total = Math.round(seconds)
  if (total < 60) return `${total}s`
  const minutes = Math.floor(total / 60)
  const rest = total % 60
  if (minutes < 60) return `${minutes}m ${rest}s`
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`
}

const dayFormat = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
})

/** "2026-10-31" -> "Oct 31". The report's days are UTC dates. */
export function formatDay(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00Z`)
  return Number.isNaN(date.getTime()) ? isoDate : dayFormat.format(date)
}

const timeFormat = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
})

export function formatTimestamp(ms: number): string {
  return timeFormat.format(new Date(ms))
}

export const formatClock = (ms: number) =>
  new Date(ms).toLocaleTimeString(undefined, { timeStyle: 'medium' })

const regionNames = new Intl.DisplayNames(['en'], { type: 'region' })

/** "DE" -> "Germany (DE)"; anything that is not a country code reads as unknown. */
export function countryLabel(code: string | null): string {
  if (!code || !/^[A-Za-z]{2}$/.test(code)) return 'Unknown'
  try {
    return `${regionNames.of(code.toUpperCase())} (${code.toUpperCase()})`
  } catch {
    return code
  }
}

export const capitalize = (value: string) =>
  value ? value[0].toUpperCase() + value.slice(1) : value

// One entry per event the beacon can send (analyticsEventNames); unknown names fall back to the raw key.
export const eventLabels: Record<AnalyticsEventName, string> = {
  resume: 'Resume opened',
  outbound: 'Outbound link',
  email: 'Email link',
  'copy-email': 'Copy email button',
  screenshot: 'Screenshot viewed',
}

export function eventLabel(name: string): string {
  return name in eventLabels ? eventLabels[name as AnalyticsEventName] : name
}
