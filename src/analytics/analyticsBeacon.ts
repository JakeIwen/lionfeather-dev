// First-party, cookieless analytics: one beacon per route view, visible time
// per route, and a few link events. Nothing identifies the browser; the Worker
// derives a daily visitor hash it can't reverse once the day's salt is gone.
// Sends only from pages the Worker served, while the owner has analytics on,
// never when the browser asks not to be tracked, and never from the owner's
// excluded browser or the admin pages.
import { resumeUrl } from '../content/site'
import { adminPath, collectPath } from '../routes'
import {
  getSiteSettings,
  servedByWorker,
} from '../settings/currentSiteSettings'
import {
  collectLimits,
  excludeBrowserKey,
  heartbeatMs,
  type AnalyticsEventName,
  type CollectPayload,
} from './analyticsContract'

type NavigatorWithGpc = Navigator & { globalPrivacyControl?: boolean }

function browserExcluded() {
  try {
    return localStorage.getItem(excludeBrowserKey) === '1'
  } catch {
    return false
  }
}

const browserOptedOut = () =>
  (navigator as NavigatorWithGpc).globalPrivacyControl === true ||
  navigator.doNotTrack === '1'

const isAdminPath = (path: string) =>
  path === adminPath || path.startsWith(`${adminPath}/`)

// Checked on every send, so switching exclusion on applies without a reload.
const sending = () =>
  servedByWorker &&
  getSiteSettings().analytics.enabled &&
  !browserOptedOut() &&
  !browserExcluded()

function send(payload: CollectPayload) {
  if (!sending() || isAdminPath(payload.path)) return
  // text/plain keeps the beacon a simple request with no preflight.
  const body = new Blob([JSON.stringify(payload)], { type: 'text/plain' })
  navigator.sendBeacon?.(collectPath, body)
}

let currentPath: string | null = null
let visibleSince: number | null = null
let unsentMs = 0

// Sends the visible time on the current route since the last engage.
function flushEngagement() {
  if (currentPath === null) return
  const now = performance.now()
  if (visibleSince !== null) unsentMs += now - visibleSince
  visibleSince = document.visibilityState === 'visible' ? now : null
  const ms = Math.min(Math.round(unsentMs), collectLimits.engageMs)
  unsentMs = 0
  if (ms >= 1000) send({ kind: 'engage', path: currentPath, ms })
}

function externalReferrer(): string | undefined {
  try {
    const referrer = new URL(document.referrer)
    if (referrer.host !== location.host) return referrer.hostname
  } catch {
    /* No referrer, or one that isn't a URL. */
  }
  return undefined
}

function landingSource(): string | undefined {
  const params = new URLSearchParams(location.search)
  return params.get('utm_source') ?? params.get('ref') ?? undefined
}

/** Call on every route change; hash-only changes keep the same view. */
export function recordView(path: string) {
  if (path === currentPath) return
  const landing = currentPath === null
  flushEngagement()
  currentPath = path
  // Start this route's clock; on landing there was no earlier route to flush.
  visibleSince =
    document.visibilityState === 'visible' ? performance.now() : null
  send({
    kind: 'view',
    path,
    ...(landing
      ? { referrer: externalReferrer(), source: landingSource() }
      : {}),
  })
}

export function recordEvent(name: AnalyticsEventName, target?: string) {
  send({ kind: 'event', path: currentPath ?? location.pathname, name, target })
}

function linkEvent(
  anchor: HTMLAnchorElement,
): { name: AnalyticsEventName; target?: string } | undefined {
  if (anchor.protocol === 'mailto:') return { name: 'email' }
  if (!anchor.protocol.startsWith('http')) return undefined
  if (anchor.origin !== location.origin)
    return { name: 'outbound', target: anchor.hostname }
  if (anchor.pathname === resumeUrl) return { name: 'resume' }
  if (anchor.pathname.startsWith('/images/'))
    return { name: 'screenshot', target: anchor.pathname }
  return undefined
}

// One delegated listener covers every link, including middle-clicks.
function handleLinkClick(event: MouseEvent) {
  if (event.type === 'auxclick' && event.button !== 1) return
  const anchor = (event.target as Element | null)?.closest?.('a[href]')
  if (!(anchor instanceof HTMLAnchorElement)) return
  const linked = linkEvent(anchor)
  if (linked) recordEvent(linked.name, linked.target)
}

let started = false

/** Installs the page-level listeners once. */
export function startPageAnalytics() {
  if (started) return
  started = true
  document.addEventListener('click', handleLinkClick)
  document.addEventListener('auxclick', handleLinkClick)
  document.addEventListener('visibilitychange', flushEngagement)
  window.addEventListener('pagehide', flushEngagement)
  // Regular engages keep the visitor in the live count and lose little time
  // when the page is closed without a pagehide.
  window.setInterval(() => {
    if (document.visibilityState === 'visible') flushEngagement()
  }, heartbeatMs)
}
