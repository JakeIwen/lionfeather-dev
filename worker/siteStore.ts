// The owner's saved site settings and appearance, one JSON row each in D1,
// and the articles edited on the site, one row each. A missing or unreadable
// row means the defaults.
import { normalizeActiveTheme, normalizeThemes } from 'theme-kit/core'
import {
  defaultSiteSettings,
  normalizeSiteSettings,
  type SiteSettings,
} from '../src/settings/siteSettings'
import {
  normalizeArticleEdits,
  type ArticleEditFields,
  type ArticleEdits,
} from '../src/articleEdits/articleEdit'
import type { ArticleSlug } from '../src/content/articles'
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

export type SiteState = {
  settings: SiteSettings
  appearance: Appearance
  articleEdits: ArticleEdits
}

type StoredRow = { key: string; value: string }
type ArticleRow = { slug: string; value: string; updated_at: number }

function parseStored(rows: StoredRow[], key: string): unknown {
  const row = rows.find((candidate) => candidate.key === key)
  if (!row) return undefined
  try {
    return JSON.parse(row.value)
  } catch {
    return undefined
  }
}

/** Each stored edit with its save time; normalizing drops unreadable rows. */
function parseArticleRows(rows: ArticleRow[]): ArticleEdits {
  const stored: Record<string, unknown> = {}
  for (const row of rows) {
    try {
      stored[row.slug] = { ...JSON.parse(row.value), updatedAt: row.updated_at }
    } catch {
      /* An unreadable row leaves the code's version in place. */
    }
  }
  return normalizeArticleEdits(stored)
}

/** Reads the saved rows from D1; the admin API uses this so it never sees a memo. */
export async function loadSiteState(db: D1Database): Promise<SiteState> {
  const [settingsRows, articleRows] = await db.batch([
    db
      .prepare('SELECT key, value FROM settings WHERE key IN (?1, ?2)')
      .bind(settingsKey, appearanceKey),
    db.prepare('SELECT slug, value, updated_at FROM article_edits'),
  ])
  const results = settingsRows!.results as StoredRow[]
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
    articleEdits: parseArticleRows(articleRows!.results as ArticleRow[]),
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
      articleEdits: {},
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

export async function saveArticleEdit(
  db: D1Database,
  slug: ArticleSlug,
  fields: ArticleEditFields,
  updatedAt: number,
) {
  await db
    .prepare(
      `INSERT INTO article_edits (slug, value, updated_at) VALUES (?1, ?2, ?3)
       ON CONFLICT (slug) DO UPDATE SET value = ?2, updated_at = ?3`,
    )
    .bind(slug, JSON.stringify(fields), updatedAt)
    .run()
  forgetSiteState()
}

export async function deleteArticleEdit(db: D1Database, slug: ArticleSlug) {
  await db.prepare('DELETE FROM article_edits WHERE slug = ?1').bind(slug).run()
  forgetSiteState()
}
