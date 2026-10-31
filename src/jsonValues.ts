// Reading values out of untrusted parsed JSON; shared by the Worker and the
// settings normalizer.
export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/** One field of a parsed body, or undefined when the body isn't an object. */
export const fieldOf = (body: unknown, field: string): unknown =>
  isRecord(body) ? body[field] : undefined
