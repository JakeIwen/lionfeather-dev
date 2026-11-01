// Text sent to the caller or logged never carries API keys, OAuth tokens or
// Access JWTs. Copied from Critter's server/safe-error.mjs and extended with
// the JWT shape, since this service handles Access tokens too.
export const safeError = (error) =>
  String(error?.message || error)
    .replace(/\bsk-[\w-]+/g, '[redacted]')
    .replace(/Bearer\s+[^\s"']+/gi, 'Bearer [redacted]')
    .replace(/\beyJ[\w-]+\.[\w-]+\.[\w-]+/g, '[redacted]')
    .slice(0, 900)
