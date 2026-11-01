import {
  CATALOG_FAILURE_TTL_MS,
  CATALOG_TTL_MS,
  DISCOVERY_TIMEOUT_MS,
} from '../limits.mjs'
import { safeError } from '../safe-error.mjs'
import { claudeOptions } from './sdk-options.mjs'

// The models and effort levels this subscription offers, from the Agent SDK's
// supportedModels() (the approach Critter's server/claude.mjs uses). Discovery
// is a handshake with the CLI, not a generation, so it costs no usage.
export const EFFORT_LEVELS = ['low', 'medium', 'high', 'xhigh', 'max']
const PREFERRED_ALIAS = 'fable'
const PREFERRED_MODEL = /fable/i

function subscriptionProblem(account) {
  if (account.apiProvider && account.apiProvider !== 'firstParty') {
    return 'Claude is configured for another API provider. Use a Claude subscription sign-in on this host.'
  }
  if (account.apiKeySource && account.apiKeySource !== 'none') {
    return 'Claude is using API-key billing. Use a Claude subscription sign-in on this host.'
  }
  if (
    !account.subscriptionType &&
    (!account.tokenSource || account.tokenSource === 'none')
  ) {
    return 'Claude is not signed in. Sign in with a Claude subscription on this host.'
  }
  return null
}

export function listedModels(models) {
  const rows = models.map((model) => ({
    id: model.value,
    resolvedModel: model.resolvedModel ?? null,
    label: (model.displayName || model.value)
      .replace(/\s*\(recommended\)\s*$/i, '')
      .slice(0, 120),
    efforts: model.supportsEffort
      ? EFFORT_LEVELS.filter((level) =>
          (model.supportedEffortLevels ?? []).includes(level),
        )
      : [],
    isDefault: model.isDefault ?? model.value === 'default',
  }))
  // The SDK's "default" row is an alias of whichever model the plan defaults
  // to (Fable on Max); keep it only when no named row already covers that model.
  return rows.filter(
    (row) =>
      row.id !== 'default' ||
      !row.resolvedModel ||
      !rows.some(
        (other) => other !== row && other.resolvedModel === row.resolvedModel,
      ),
  )
}

/** Fable when the subscription offers it (its short alias first), else the SDK's default. */
export function pickDefaultModel(models) {
  const choice =
    models.find((model) => model.id === PREFERRED_ALIAS) ??
    models.find((model) => PREFERRED_MODEL.test(model.id)) ??
    models.find((model) => PREFERRED_MODEL.test(model.resolvedModel ?? '')) ??
    models.find((model) => model.isDefault) ??
    models[0]
  return choice.id
}

export function createModelCatalog({
  query,
  cwd,
  resolveExecutable,
  now = Date.now,
  discoveryTimeoutMs = DISCOVERY_TIMEOUT_MS,
}) {
  let cached = null
  let pending = null

  async function discover() {
    let timer
    let release
    const idle = new Promise((resolve) => {
      release = resolve
    })
    async function* idlePrompt() {
      await idle
    }
    let session
    try {
      session = query({
        prompt: idlePrompt(),
        options: claudeOptions(cwd, resolveExecutable),
      })
      const read = async () => {
        await session.initializationResult()
        const problem = subscriptionProblem(await session.accountInfo())
        if (problem) throw new Error(problem)
        return listedModels(await session.supportedModels())
      }
      const timeout = new Promise((_, reject) => {
        timer = setTimeout(
          () => reject(new Error('Claude model discovery timed out.')),
          discoveryTimeoutMs,
        )
      })
      const models = await Promise.race([read(), timeout])
      if (!models.length)
        throw new Error('No Claude models are available to this subscription.')
      return models
    } finally {
      clearTimeout(timer)
      release()
      session?.close()
    }
  }

  async function load() {
    try {
      const models = await discover()
      cached = { models, error: null, expires: now() + CATALOG_TTL_MS }
    } catch (error) {
      cached = {
        models: [],
        error: safeError(error),
        expires: now() + CATALOG_FAILURE_TTL_MS,
      }
    }
    return cached
  }

  /** Resolves with the catalog; rejects with a redacted message when discovery fails. */
  return {
    async list() {
      if (!cached || cached.expires <= now()) {
        pending ??= load().finally(() => {
          pending = null
        })
        await pending
      }
      if (cached.error) throw new Error(cached.error)
      return cached.models
    },
  }
}
