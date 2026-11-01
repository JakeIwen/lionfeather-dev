// The Worker's bindings and vars, as declared in wrangler.jsonc.
export type Env = {
  ASSETS: Fetcher
  DB: D1Database
  // Cloudflare Access team host, e.g. "team.cloudflareaccess.com".
  ACCESS_TEAM_DOMAIN: string
  // The Access application's audience tag. Empty until the app exists, and an
  // empty value rejects every admin request.
  ACCESS_AUD: string
  OWNER_EMAIL: string
  // The article review service on the Hetzner server, behind its own Access
  // app that admits only this Worker's service token.
  REVIEW_SERVICE_URL: string
  // Secrets (wrangler secret put); unset means Review answers 503.
  REVIEW_ACCESS_CLIENT_ID?: string
  REVIEW_ACCESS_CLIENT_SECRET?: string
}
