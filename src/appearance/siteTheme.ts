// The site's side of the shared theme model (theme-kit): its knob defaults and
// built-in themes, used by the Worker's appearance routes and first-paint style,
// the admin theme editor and the development editor.
import { knobSpecs } from 'theme-kit/core'
import type { ActiveTheme, KnobValues, Theme } from 'theme-kit/core'

// Matches the :root knobs in src/styles/palette.css, so a page served without
// the Worker looks the same as the default theme.
const clay: KnobValues = Object.freeze({
  hueNeutral: 65,
  hueBrand: 50,
  hueAccent: 155,
  chroma: 0.85,
})

/** The four knobs keep theme-kit's property names; defaults are Clay's. */
export const siteKnobs = knobSpecs({
  hueNeutral: { default: clay.hueNeutral },
  hueBrand: { default: clay.hueBrand },
  hueAccent: { default: clay.hueAccent },
  chroma: { default: clay.chroma },
})

/** Locked themes; the first is the fallback. */
export const builtinThemes: readonly Theme[] = Object.freeze([
  { id: 'clay', name: 'Clay', knobs: clay },
  {
    id: 'sage',
    name: 'Sage',
    knobs: { hueNeutral: 120, hueBrand: 145, hueAccent: 40, chroma: 1 },
  },
  {
    id: 'blue-slate',
    name: 'Blue slate',
    knobs: { hueNeutral: 245, hueBrand: 250, hueAccent: 55, chroma: 0.9 },
  },
  {
    id: 'plum',
    name: 'Plum',
    knobs: { hueNeutral: 305, hueBrand: 315, hueAccent: 70, chroma: 0.8 },
  },
  {
    id: 'teal',
    name: 'Teal',
    knobs: { hueNeutral: 180, hueBrand: 190, hueAccent: 35, chroma: 0.95 },
  },
])

export const isBuiltinTheme = (id: string) =>
  builtinThemes.some((theme) => theme.id === id)

export const defaultActiveTheme = (): ActiveTheme => ({
  id: builtinThemes[0].id,
  knobs: { ...builtinThemes[0].knobs },
})

/** What the Worker stores and the admin API returns. */
export type Appearance = { active: ActiveTheme; themes: Theme[] }

export const themeStyleElementId = 'theme-knobs'
