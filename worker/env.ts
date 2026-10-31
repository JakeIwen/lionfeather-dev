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
}
