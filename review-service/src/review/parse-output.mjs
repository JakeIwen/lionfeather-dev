import { MAX_FINDINGS } from '../limits.mjs'

// Turns the model's JSON into the finding list the editor can act on. The
// editor's Apply button replaces `quote` with `suggestion`, so a quote must be
// text that really sits in the article Markdown.
export class ReviewFormatError extends Error {}

const MAX_SUMMARY = 2000
const MAX_FIELD = 2000
const MAX_QUOTE = 4000

/** The article's own text for `quote`, tolerating whitespace the model changed. */
export function locateQuote(quote, markdown) {
  if (markdown.includes(quote)) return quote
  const trimmed = quote.trim()
  if (trimmed && markdown.includes(trimmed)) return trimmed
  if (!trimmed) return null
  // Models often rejoin wrapped lines; match on words and take the real text.
  const words = trimmed
    .split(/\s+/)
    .map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const match = new RegExp(words.join('\\s+')).exec(markdown)
  return match ? match[0] : null
}

function cleanFinding(raw, markdown) {
  if (!raw || typeof raw !== 'object') return null
  const { quote, problem, suggestion } = raw
  if (
    typeof quote !== 'string' ||
    typeof problem !== 'string' ||
    typeof suggestion !== 'string'
  ) {
    return null
  }
  if (!problem.trim()) return null
  const found = quote === '' ? '' : locateQuote(quote, markdown)
  if (found === null || found.length > MAX_QUOTE) return null
  // A suggestion identical to the quote would offer an Apply that changes nothing.
  if (found && suggestion === found) return null
  return {
    quote: found,
    problem: problem.trim().slice(0, MAX_FIELD),
    suggestion: suggestion.slice(0, MAX_FIELD),
  }
}

/**
 * @param {unknown} value what the model returned
 * @param {string} markdown the article body the quotes must come from
 * @throws {ReviewFormatError} when the shape is wrong (worth one repair retry)
 */
export function parseReviewOutput(value, markdown) {
  if (!value || typeof value !== 'object')
    throw new ReviewFormatError('The reply was not a JSON object.')
  if (typeof value.summary !== 'string')
    throw new ReviewFormatError('"summary" must be a string.')
  if (!Array.isArray(value.findings))
    throw new ReviewFormatError('"findings" must be an array.')
  const findings = value.findings
    .map((raw) => cleanFinding(raw, markdown))
    .filter(Boolean)
    .slice(0, MAX_FINDINGS)
  return { summary: value.summary.trim().slice(0, MAX_SUMMARY), findings }
}

/** Reads JSON from reply text, allowing a Markdown code fence around it. */
export function jsonFromText(text) {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/.exec(text)
  try {
    return JSON.parse((fenced ? fenced[1] : text).trim())
  } catch {
    throw new ReviewFormatError('The reply was not valid JSON.')
  }
}
