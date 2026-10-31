// Theme endpoints, mirroring the shared theme-kit contract: built-in themes
// are locked, saved themes belong to the owner, and the active theme carries
// its own knob values so unsaved slider adjustments survive.
import {
  activeThemeProblem,
  normalizeKnobs,
  themeProblem,
  type Theme,
} from 'theme-kit/core'
import {
  isBuiltinTheme,
  siteKnobs,
  type Appearance,
} from '../src/appearance/siteTheme'
import { adminApi } from '../src/routes'
import type { AdminContext } from './adminContext'
import { errorResponse, jsonResponse } from './jsonResponse'
import { fieldOf } from '../src/jsonValues'
import { loadSiteState, saveAppearance } from './siteStore'

const themePrefix = adminApi.appearanceTheme('')

/** The theme id in /admin/api/appearance/themes/:id, or undefined. */
export function themeIdFromPath(pathname: string): string | undefined {
  if (!pathname.startsWith(themePrefix)) return undefined
  const rest = pathname.slice(themePrefix.length)
  if (!rest || rest.includes('/')) return undefined
  try {
    return decodeURIComponent(rest)
  } catch {
    return undefined
  }
}

async function save(
  { env }: AdminContext,
  appearance: Appearance,
): Promise<Response> {
  await saveAppearance(env.DB, appearance)
  return jsonResponse(appearance)
}

export async function getAppearance({ env }: AdminContext): Promise<Response> {
  return jsonResponse((await loadSiteState(env.DB)).appearance)
}

export async function putActiveTheme(context: AdminContext): Promise<Response> {
  const active = fieldOf(await context.json(), 'active')
  const problem = activeThemeProblem(siteKnobs, active)
  if (problem) return errorResponse(400, problem)
  const { id, knobs } = active as { id: string; knobs: unknown }
  const appearance = (await loadSiteState(context.env.DB)).appearance
  if (
    !isBuiltinTheme(id) &&
    !appearance.themes.some((theme) => theme.id === id)
  )
    return errorResponse(400, `No theme with id ${id}`)
  return save(context, {
    ...appearance,
    active: { id, knobs: normalizeKnobs(siteKnobs, knobs) },
  })
}

export async function putTheme(
  context: AdminContext,
  id: string,
): Promise<Response> {
  const theme = fieldOf(await context.json(), 'theme')
  const problem = themeProblem(siteKnobs, theme)
  if (problem) return errorResponse(400, problem)
  const wanted = theme as Theme
  if (wanted.id !== id) return errorResponse(400, 'Theme id must match the URL')
  if (isBuiltinTheme(id))
    return errorResponse(400, "Built-in themes can't be changed")
  const appearance = (await loadSiteState(context.env.DB)).appearance
  const saved: Theme = {
    id,
    name: wanted.name.trim(),
    knobs: normalizeKnobs(siteKnobs, wanted.knobs),
  }
  const exists = appearance.themes.some((item) => item.id === id)
  return save(context, {
    ...appearance,
    themes: exists
      ? appearance.themes.map((item) => (item.id === id ? saved : item))
      : [...appearance.themes, saved],
  })
}

export async function deleteTheme(
  context: AdminContext,
  id: string,
): Promise<Response> {
  if (isBuiltinTheme(id))
    return errorResponse(400, "Built-in themes can't be deleted")
  const appearance = (await loadSiteState(context.env.DB)).appearance
  if (!appearance.themes.some((theme) => theme.id === id))
    return errorResponse(404, `No saved theme with id ${id}`)
  return save(context, {
    ...appearance,
    themes: appearance.themes.filter((theme) => theme.id !== id),
  })
}
