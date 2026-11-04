// The settings this page shows: the copy the Worker injected (defaults when
// served without it), replaced when the owner saves so pages reached by in-app
// navigation show the new settings too. DOM-only, so the Worker never imports it.
import { useSyncExternalStore } from 'react'
import {
  normalizeSiteSettings,
  settingsElementId,
  type SiteSettings,
} from './siteSettings'

// Present only when the Worker served the page; local builds use the defaults.
function injectedSettings(): unknown {
  const element = document.getElementById(settingsElementId)
  if (!element?.textContent) return undefined
  try {
    return JSON.parse(element.textContent)
  } catch {
    return undefined
  }
}

const injected = injectedSettings()

// Analytics sends only from pages the Worker served, never from local builds.
// The local server copies the live state into its pages (scripts/live-site-state.mjs),
// so the injected settings alone no longer prove a Worker served the page.
export const servedByWorker =
  injected !== undefined &&
  !['127.0.0.1', 'localhost', '[::1]'].includes(location.hostname)

let current = normalizeSiteSettings(injected)
const listeners = new Set<() => void>()

export const getSiteSettings = () => current

export function replaceSiteSettings(next: SiteSettings) {
  current = next
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export const useSiteSettings = () =>
  useSyncExternalStore(subscribe, getSiteSettings)
