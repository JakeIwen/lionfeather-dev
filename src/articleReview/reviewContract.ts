// The AI article review: the owner's model choice, the model catalog, and the
// lines the review streams back. The review itself runs on the review service
// (review-service/, on the Hetzner server, on the owner's Claude plan); the
// Worker proxies to it, so these shapes are shared by the Worker and the app.
import { isRecord } from '../jsonValues'

export type ReviewSettings = { model: string; effort: string }

export const reviewSettingsKey = 'review'

// `fable` is the Agent SDK's alias for the newest Fable on the owner's plan.
export const defaultReviewSettings = (): ReviewSettings => ({
  model: 'fable',
  effort: 'high',
})

export type ReviewModel = { id: string; label: string; efforts: string[] }

export type ReviewCatalog = {
  models: ReviewModel[]
  defaultModel: string
  defaultEffort: string
}

export type ReviewFinding = {
  // Exact text from the article's Markdown; empty when the finding is about
  // the title or summary.
  quote: string
  problem: string
  suggestion: string
}

export type ReviewLine =
  | { type: 'started'; model: string }
  | { type: 'progress'; elapsedMs: number }
  | {
      type: 'result'
      model: string
      summary: string
      findings: ReviewFinding[]
    }
  | { type: 'error'; message: string }

const idPattern = /^[A-Za-z0-9._:[\]-]{1,100}$/

/** The saved settings, or the defaults for anything missing or malformed. */
export function normalizeReviewSettings(value: unknown): ReviewSettings {
  const defaults = defaultReviewSettings()
  if (!isRecord(value)) return defaults
  const pick = (field: unknown, fallback: string) =>
    typeof field === 'string' && idPattern.test(field) ? field : fallback
  return {
    model: pick(value.model, defaults.model),
    effort: pick(value.effort, defaults.effort),
  }
}

/** Why a write is rejected against the catalog, or undefined. */
export function reviewSettingsProblem(
  value: unknown,
  catalog: ReviewCatalog,
): string | undefined {
  if (!isRecord(value)) return 'Review settings must be an object.'
  const model = catalog.models.find((entry) => entry.id === value.model)
  if (!model) return `The review service does not offer model ${value.model}.`
  if (typeof value.effort !== 'string' || !model.efforts.includes(value.effort))
    return `${model.label} does not support effort ${value.effort}.`
  return undefined
}

/**
 * The settings with `model` chosen, keeping the effort when that model
 * supports it and otherwise taking its highest.
 */
export const withModel = (
  settings: ReviewSettings,
  model: ReviewModel,
): ReviewSettings => ({
  model: model.id,
  effort: model.efforts.includes(settings.effort)
    ? settings.effort
    : (model.efforts.at(-1) ?? settings.effort),
})

/** A catalog from the service, or undefined when it doesn't have that shape. */
export function parseReviewCatalog(value: unknown): ReviewCatalog | undefined {
  if (!isRecord(value) || !Array.isArray(value.models)) return undefined
  const models = value.models.filter(
    (model): model is ReviewModel =>
      isRecord(model) &&
      typeof model.id === 'string' &&
      typeof model.label === 'string' &&
      Array.isArray(model.efforts) &&
      model.efforts.every((effort) => typeof effort === 'string'),
  )
  if (
    typeof value.defaultModel !== 'string' ||
    typeof value.defaultEffort !== 'string'
  )
    return undefined
  return {
    models,
    defaultModel: value.defaultModel,
    defaultEffort: value.defaultEffort,
  }
}
