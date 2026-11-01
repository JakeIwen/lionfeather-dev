// Remembers that this browser has signed in to the admin, so the header's
// Settings button and article pages' Edit links show there and nowhere else.
// Only a convenience: everything they lead to sits behind Cloudflare Access.
import { useSyncExternalStore } from 'react'

const ownerBrowserKey = 'lionfeather-owner-v1'
const listeners = new Set<() => void>()

function readFlag(): boolean {
  try {
    return localStorage.getItem(ownerBrowserKey) === '1'
  } catch {
    return false
  }
}

let owner = readFlag()

export function markOwnerBrowser() {
  try {
    localStorage.setItem(ownerBrowserKey, '1')
  } catch {
    /* Storage is blocked: the owner links show for this page view only. */
  }
  if (owner) return
  owner = true
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export const useOwnerBrowser = () =>
  useSyncExternalStore(subscribe, () => owner)
