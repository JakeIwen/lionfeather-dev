import { MAX_FINDINGS } from '../limits.mjs'

// The JSON the model must return, as a JSON Schema for the SDK's structured
// output. parse-output.mjs still validates the result: a schema is a request
// to the model, not input checking.
export const REVIEW_OUTPUT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['summary', 'findings'],
  properties: {
    summary: { type: 'string' },
    findings: {
      type: 'array',
      maxItems: MAX_FINDINGS,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['quote', 'problem', 'suggestion'],
        properties: {
          quote: { type: 'string' },
          problem: { type: 'string' },
          suggestion: { type: 'string' },
        },
      },
    },
  },
}
