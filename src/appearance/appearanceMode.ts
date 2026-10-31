// The Soft/Dark appearance mode. public/theme.js applies the saved or system
// mode before first paint; the header toggle and the theme editor's mode
// control share it through this store.
export type AppearanceMode = 'light' | 'dark'

export const modeStorageKey = 'lionfeather-theme-v1'
export const modeOptions: readonly { id: AppearanceMode; label: string }[] = [
  { id: 'light', label: 'Soft' },
  { id: 'dark', label: 'Dark' },
]

const root = document.documentElement
const system = window.matchMedia('(prefers-color-scheme: dark)')
const listeners = new Set<() => void>()

function savedMode(): AppearanceMode | null {
  try {
    const value = localStorage.getItem(modeStorageKey)
    return value === 'light' || value === 'dark' ? value : null
  } catch {
    return null
  }
}

const systemMode = (): AppearanceMode => (system.matches ? 'dark' : 'light')
// Until the visitor picks, the page follows the system setting.
let explicitChoice = savedMode() !== null

function apply(mode: AppearanceMode) {
  root.dataset.theme = mode
  listeners.forEach((listener) => listener())
}

export const getMode = (): AppearanceMode =>
  root.dataset.theme === 'dark' ? 'dark' : 'light'

export function setMode(mode: AppearanceMode) {
  explicitChoice = true
  apply(mode)
  try {
    localStorage.setItem(modeStorageKey, mode)
  } catch {
    /* The current tab still switches when storage is unavailable. */
  }
}

export function subscribeMode(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

system.addEventListener('change', () => {
  if (!explicitChoice) apply(systemMode())
})
window.addEventListener('storage', (event) => {
  if (event.key !== modeStorageKey && event.key !== null) return
  const saved = savedMode()
  explicitChoice = saved !== null
  apply(saved ?? systemMode())
})
