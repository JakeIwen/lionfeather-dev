import { safeError } from '../safe-error.mjs'

// Reads one Agent SDK query to its result. The refusal handling follows
// Critter's server/claude.mjs readResult: a refusal the CLI retried on a
// fallback model is not a failure, one it could not retry is.
export class ReviewFailure extends Error {
  constructor(message, { declined = false } = {}) {
    super(message)
    this.declined = declined
  }
}

const ASSISTANT_ERRORS = {
  authentication_failed:
    'Claude rejected this server’s sign-in. Renew the Claude token.',
  oauth_org_not_allowed: 'This Claude sign-in is not allowed to use the model.',
  account_on_hold: 'The Claude account is on hold.',
  billing_error: 'Claude reported a billing problem with the subscription.',
  rate_limit: 'Claude’s usage limit was reached. Try again later.',
  overloaded: 'Claude is overloaded. Try again shortly.',
  model_not_found: 'That model is not available to this Claude account.',
}

function excerpt(text) {
  const line = safeError(text).replace(/\s+/g, ' ').trim()
  return line.length > 160 ? `${line.slice(0, 159).trimEnd()}…` : line
}

function declined(reply) {
  const detail = reply ? `: “${excerpt(reply)}”` : '.'
  return new ReviewFailure(`Claude declined to review this article${detail}`, {
    declined: true,
  })
}

const textOf = (message) =>
  (message.message?.content ?? [])
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('\n')

/** @returns {Promise<{structured: unknown, text: string, model: string|null}>} */
export async function readSession(session) {
  let text = ''
  let refusal = null
  let model = null
  let assistantError = null
  for await (const message of session) {
    if (
      message.type === 'system' &&
      message.subtype === 'model_refusal_no_fallback'
    ) {
      refusal = message
    }
    if (
      message.type === 'system' &&
      message.subtype === 'model_refusal_fallback'
    ) {
      refusal = null
      model = message.fallback_model ?? model
    }
    if (message.type === 'assistant') {
      const content = textOf(message)
      if (content) text = content
      if (message.message?.model && message.message.model !== '<synthetic>') {
        model = message.message.model
      }
      if (message.message?.stop_reason === 'refusal')
        refusal = { stop_reason: 'refusal' }
      if (message.error) assistantError = message.error
    }
    if (message.type !== 'result') continue
    if (message.stop_reason === 'refusal' || refusal)
      throw declined(text || message.result)
    if (message.is_error || message.subtype !== 'success') {
      const known = ASSISTANT_ERRORS[assistantError]
      const reason =
        message.errors?.join(' ') ||
        message.result ||
        'Claude could not complete the review.'
      throw new ReviewFailure(known ?? safeError(reason))
    }
    return {
      structured: message.structured_output,
      text: text || message.result || '',
      model,
    }
  }
  if (refusal) throw declined(text)
  throw new ReviewFailure('Claude returned no review.')
}
