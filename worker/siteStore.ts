// The owner's saved site settings and appearance, one JSON row each in D1.
// A missing or unreadable row means the defaults.
import { normalizeActiveTheme, normalizeThemes } from 'theme-kit/core'
import {
  defaultSiteSettings,
  normalizeSiteSettings,
  type SiteSettings,
} from '../src/settings/siteSettings'
import {
  defaultActiveTheme,
  isBuiltinTheme,
  siteKnobs,
  type Appearance,
} from '../src/appearance/siteTheme'

const settingsKey = 'site'
const appearanceKey = 'appearance'
// Page loads and beacons share one read for this long per isolate. Writes made
// through this isolate clear it; other isolates catch up within the window.
const memoMs = 10_000

export type SiteState = { settings: SiteSettings; appearance: Appearance }

type StoredRow = { key: string; value: string }

function parseStored(rows: StoredRow[], key: string): unknown {
  const row = rows.find((candidate) => candidate.key === key)
  if (!row) return undefined
  try {
    return JSON.parse(row.value)
  } catch {
    return undefined
  }
}

/** Reads both rows from D1; the admin API uses this so it never sees a memo. */
export async function loadSiteState(db: D1Database): Promise<SiteState> {
  const { results } = await db
    .prepare('SELECT key, value FROM settings WHERE key IN (?1, ?2)')
    .bind(settingsKey, appearanceKey)
    .all<StoredRow>()
  const appearance = parseStored(results, appearanceKey) as
    { active?: unknown; themes?: unknown } | undefined
  return {
    settings: normalizeSiteSettings(parseStored(results, settingsKey)),
    appearance: {
      active: normalizeActiveTheme(
        siteKnobs,
        appearance?.active,
        defaultActiveTheme(),
      ),
      // Built-in themes are locked and live in code, never in storage.
      themes: normalizeThemes(siteKnobs, appearance?.themes).filter(
        (theme) => !isBuiltinTheme(theme.id),
      ),
    },
  }
}

let memo: { at: number; state: SiteState } | undefined

export const forgetSiteState = () => {
  memo = undefined
}

/**
 * The state public pages and beacons use. A D1 failure serves the defaults
 * (not remembered) rather than failing every page of a portfolio site.
 */
export async function currentSiteState(
  db: D1Database,
  now = Date.now(),
): Promise<SiteState> {
  if (memo && now - memo.at < memoMs) return memo.state
  try {
    const state = await loadSiteState(db)
    memo = { at: now, state }
    return state
  } catch (error) {
    console.error('Reading site settings failed', error)
    return {
      settings: defaultSiteSettings(),
      appearance: { active: defaultActiveTheme(), themes: [] },
    }
  }
}

async function saveRow(db: D1Database, key: string, value: unknown) {
  await db
    .prepare(
      `INSERT INTO settings (key, value, updated_at) VALUES (?1, ?2, ?3)
       ON CONFLICT (key) DO UPDATE SET value = ?2, updated_at = ?3`,
    )
    .bind(key, JSON.stringify(value), Date.now())
    .run()
  forgetSiteState()
}

export const saveSiteSettings = (db: D1Database, settings: SiteSettings) =>
  saveRow(db, settingsKey, settings)

export const saveAppearance = (db: D1Database, appearance: Appearance) =>
  saveRow(db, appearanceKey, appearance)
