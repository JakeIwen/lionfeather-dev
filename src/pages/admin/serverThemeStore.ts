// The theme editor's store, backed by the Worker's /admin/api/appearance routes.
// The Worker writes the active knobs into every page it serves; this applies
// knobs inline only for previews and for what a save or activation just stored.
import {
  applyKnobs,
  normalizeActiveTheme,
  normalizeThemes,
} from 'theme-kit/core'
import type { KnobValues } from 'theme-kit/core'
import type { ThemeLibrarySnapshot, ThemeStore } from 'theme-kit'
import {
  defaultActiveTheme,
  siteKnobs,
  type Appearance,
} from '../../appearance/siteTheme'
import { adminApi } from '../../routes'
import { adminRequest } from './adminClient'

const listeners = new Set<() => void>()
let library: ThemeLibrarySnapshot = { themes: [], active: defaultActiveTheme() }
let previewKnobs: KnobValues | null = null

const show = () =>
  applyKnobs(
    siteKnobs,
    previewKnobs ?? library.active.knobs,
    document.documentElement.style,
  )

// The response is validated like any stored theme data: bad entries drop out.
function learn(response: unknown, apply: boolean) {
  const { themes, active } = (response ?? {}) as Partial<Appearance>
  library = {
    themes: normalizeThemes(siteKnobs, themes),
    active: normalizeActiveTheme(siteKnobs, active, defaultActiveTheme()),
  }
  if (apply) show()
  listeners.forEach((listener) => listener())
}

const send = async (url: string, method: 'PUT' | 'DELETE', body?: unknown) =>
  learn(await adminRequest(url, { method, body }), true)

/** Reads the library from the Worker. Loading only reads: the page already carries the active knobs. */
export async function loadAppearance() {
  learn(await adminRequest(adminApi.appearance), false)
}

export const themeStore: ThemeStore = {
  snapshot: () => library,
  subscribe(listener) {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
  saveTheme: (theme) =>
    send(adminApi.appearanceTheme(theme.id), 'PUT', { theme }),
  deleteTheme: (id) => send(adminApi.appearanceTheme(id), 'DELETE'),
  activate: (active) => send(adminApi.appearanceActive, 'PUT', { active }),
  preview(knobs) {
    previewKnobs = knobs
    show()
  },
}
