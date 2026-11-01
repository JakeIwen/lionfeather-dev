// Tunable bounds in one place so the routes, prompt and tests agree on them.
export const REQUEST_LIMIT_BYTES = 512 * 1024
// Cloudflare drops responses that stay idle for about 100 s; stay well inside it.
export const PROGRESS_INTERVAL_MS = 10_000
export const REVIEW_TIMEOUT_MS = 10 * 60_000
export const CATALOG_TTL_MS = 5 * 60_000
// A failed discovery is retried soon rather than cached for the full lifetime.
export const CATALOG_FAILURE_TTL_MS = 30_000
export const DISCOVERY_TIMEOUT_MS = 20_000
export const MAX_FINDINGS = 15
// The structured-output end-turn tool needs a turn beyond the model's reply.
export const MAX_TURNS = 3
export const JWKS_TTL_MS = 10 * 60_000
export const JWKS_MIN_REFETCH_MS = 60_000
export const CLOCK_SKEW_MS = 30_000
