import {
  normalizeSiteSettings,
  siteSettingsProblem,
} from '../src/settings/siteSettings'
import type { AdminContext } from './adminContext'
import { errorResponse, jsonResponse } from './jsonResponse'
import { fieldOf } from '../src/jsonValues'
import { loadSiteState, saveSiteSettings } from './siteStore'

export async function getSettings({ env }: AdminContext): Promise<Response> {
  return jsonResponse((await loadSiteState(env.DB)).settings)
}

export async function putSettings({
  env,
  json,
}: AdminContext): Promise<Response> {
  const body = await json()
  const settings = fieldOf(body, 'settings')
  const problem = siteSettingsProblem(settings)
  if (problem) return errorResponse(400, problem)
  const saved = normalizeSiteSettings(settings)
  await saveSiteSettings(env.DB, saved)
  return jsonResponse(saved)
}
