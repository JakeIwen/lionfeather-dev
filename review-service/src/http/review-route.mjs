import {
  PROGRESS_INTERVAL_MS,
  REQUEST_LIMIT_BYTES,
  REVIEW_TIMEOUT_MS,
} from '../limits.mjs'
import { EFFORT_LEVELS } from '../claude/model-catalog.mjs'
import { ReviewFailure } from '../claude/read-session.mjs'
import { parseReviewRequest } from '../review/request.mjs'
import { safeError } from '../safe-error.mjs'
import { HttpError, readJsonBody, sendJson } from './json.mjs'

// POST /review: validates, then streams newline-delimited JSON. The stream
// stays alive with progress lines because Cloudflare closes responses that sit
// idle for ~100 s and a high-effort review can take minutes.
function chosenEffort(listed, effort) {
  // A model without effort levels ignores the setting, but the name must still be real.
  if (!listed.efforts.length)
    return EFFORT_LEVELS.includes(effort) ? { value: null } : null
  return listed.efforts.includes(effort) ? { value: effort } : null
}

export function createReviewRoute({
  catalog,
  review,
  progressMs = PROGRESS_INTERVAL_MS,
  timeoutMs = REVIEW_TIMEOUT_MS,
  requestLimit = REQUEST_LIMIT_BYTES,
  now = Date.now,
  log = () => {},
}) {
  // One review at a time: each is a long, expensive subscription turn.
  let busy = false

  async function stream(res, request, modelId) {
    res.writeHead(200, {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Accel-Buffering': 'no',
    })
    const write = (line) => {
      if (!res.writableEnded && !res.destroyed)
        res.write(`${JSON.stringify(line)}\n`)
    }
    const controller = new AbortController()
    const startedAt = now()
    let timedOut = false
    // Closing before we end the response means the browser or Worker went away.
    res.on('close', () => {
      if (!res.writableEnded) controller.abort()
    })
    const timer = setTimeout(() => {
      timedOut = true
      controller.abort()
    }, timeoutMs)
    const ticker = setInterval(
      () => write({ type: 'progress', elapsedMs: now() - startedAt }),
      progressMs,
    )
    write({ type: 'started', model: modelId })
    let outcome = 'result'
    try {
      const { model, summary, findings } = await review(
        request,
        controller.signal,
      )
      write({ type: 'result', model, summary, findings })
    } catch (error) {
      outcome = timedOut ? 'timeout' : 'error'
      const minutes = Math.round(timeoutMs / 60_000)
      write({
        type: 'error',
        message: timedOut
          ? `The review took longer than ${minutes} minutes and was stopped.`
          : error instanceof ReviewFailure
            ? error.message
            : safeError(error),
      })
    } finally {
      clearTimeout(timer)
      clearInterval(ticker)
      res.end()
    }
    log(
      `review ${modelId} ${request.effort ?? 'default'} ${outcome} ${now() - startedAt}ms`,
    )
  }

  return async function reviewRoute(req, res) {
    const parsed = parseReviewRequest(await readJsonBody(req, requestLimit))
    if (parsed.error) throw new HttpError(400, parsed.error)
    if (busy)
      throw new HttpError(
        429,
        'Another review is already running. Try again shortly.',
      )
    busy = true
    try {
      let models
      try {
        models = await catalog.list()
      } catch (error) {
        return sendJson(res, 502, { error: safeError(error) })
      }
      const listed = models.find((model) => model.id === parsed.value.model)
      if (!listed)
        throw new HttpError(
          400,
          `Model ${parsed.value.model} is not available.`,
        )
      const effort = chosenEffort(listed, parsed.value.effort)
      if (!effort) {
        throw new HttpError(
          400,
          `Effort ${parsed.value.effort} is not available for ${listed.id}.`,
        )
      }
      await stream(res, { ...parsed.value, effort: effort.value }, listed.id)
    } finally {
      busy = false
    }
  }
}
