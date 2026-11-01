// Remembers that this browser has signed in to the admin, so article pages can
// offer an Edit link there and nowhere else. Only a convenience: the editor
// itself sits behind Cloudflare Access like the rest of /admin.
const ownerBrowserKey = 'lionfeather-owner-v1'

export function markOwnerBrowser() {
  try {
    localStorage.setItem(ownerBrowserKey, '1')
  } catch {
    /* Storage is blocked: article pages just won't show the Edit link. */
  }
}

export function isOwnerBrowser(): boolean {
  try {
    return localStorage.getItem(ownerBrowserKey) === '1'
  } catch {
    return false
  }
}
