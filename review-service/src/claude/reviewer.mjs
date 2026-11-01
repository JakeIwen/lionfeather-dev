import { MAX_TURNS } from '../limits.mjs'
import {
  buildRepairPrompt,
  buildReviewPrompt,
  SYSTEM_PROMPT,
} from '../review/prompt.mjs'
import { REVIEW_OUTPUT_SCHEMA } from '../review/output-schema.mjs'
import {
  jsonFromText,
  parseReviewOutput,
  ReviewFormatError,
} from '../review/parse-output.mjs'
import { claudeOptions } from './sdk-options.mjs'
import { readSession, ReviewFailure } from './read-session.mjs'

// Runs one article review as a tool-less Agent SDK query. Asks for structured
// output; if the reply still does not fit, sends one repair prompt.
const CANCELLED = 'The review was cancelled.'

function stopOnAbort(signal, session) {
  let onAbort
  const stopped = new Promise((_, reject) => {
    onAbort = () => {
      session.interrupt?.().catch(() => {})
      session.close()
      reject(new ReviewFailure(CANCELLED))
    }
    if (signal.aborted) onAbort()
    else signal.addEventListener('abort', onAbort, { once: true })
  })
  return {
    stopped,
    release: () => signal.removeEventListener('abort', onAbort),
  }
}

export function createReviewer({ query, cwd, resolveExecutable }) {
  async function attempt({ prompt, model, effort, signal }) {
    const abortController = new AbortController()
    signal.addEventListener('abort', () => abortController.abort(), {
      once: true,
    })
    const session = query({
      prompt,
      options: {
        ...claudeOptions(cwd, resolveExecutable),
        model,
        ...(effort ? { effort } : {}),
        systemPrompt: SYSTEM_PROMPT,
        maxTurns: MAX_TURNS,
        abortController,
        outputFormat: { type: 'json_schema', schema: REVIEW_OUTPUT_SCHEMA },
      },
    })
    const { stopped, release } = stopOnAbort(signal, session)
    try {
      return await Promise.race([readSession(session), stopped])
    } finally {
      release()
      session.close()
    }
  }

  function interpret(reply, markdown) {
    const value =
      reply.structured !== undefined
        ? reply.structured
        : jsonFromText(reply.text)
    return parseReviewOutput(value, markdown)
  }

  /**
   * @param {{model: string, effort: string|null, article: object, previous: object|null}} request
   * @returns {Promise<{model: string, summary: string, findings: object[]}>}
   * @throws {ReviewFailure}
   */
  return async function review(request, signal) {
    const { model, effort } = request
    let prompt = buildReviewPrompt(request)
    for (let tries = 0; ; tries++) {
      const reply = await attempt({ prompt, model, effort, signal })
      try {
        return {
          model: reply.model ?? model,
          ...interpret(reply, request.article.markdown),
        }
      } catch (error) {
        if (!(error instanceof ReviewFormatError)) throw error
        if (tries >= 1) {
          throw new ReviewFailure(
            'Claude’s review could not be read. Try the review again.',
          )
        }
        prompt = buildRepairPrompt(request, error.message)
      }
    }
  }
}
