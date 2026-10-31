// Ensures the owner-only Cloudflare Access app in front of /admin (the admin
// page and its API), then prints the app's audience tag for ACCESS_AUD in
// wrangler.jsonc. Idempotent. Uses the account token that lionfeather-edge keeps
// in ~/.config/lionfeather-edge/cloudflare-api-token; the email one-time PIN
// login it relies on comes from that repo's `npm run access:setup`.
import { readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse } from 'jsonc-parser'

const api = 'https://api.cloudflare.com/client/v4'
const tokenFile = join(
  homedir(),
  '.config/lionfeather-edge/cloudflare-api-token',
)
const appName = 'Portfolio admin'
const policyName = 'Portfolio admin owner'
const session = '168h'

const root = fileURLToPath(new URL('../', import.meta.url))
const config = parse(readFileSync(join(root, 'wrangler.jsonc'), 'utf8'))
const owner = config.vars?.OWNER_EMAIL
const host = config.routes?.[0]?.pattern
if (!owner || !host)
  throw new Error('wrangler.jsonc needs vars.OWNER_EMAIL and a route.')
const appDomain = `${host}/admin`
const token = readFileSync(tokenFile, 'utf8').trim()

async function cf(method, path, body) {
  const response = await fetch(api + path, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body && JSON.stringify(body),
  })
  const result = await response.json()
  if (!result.success)
    throw new Error(`${method} ${path}: ${JSON.stringify(result.errors)}`)
  return result.result
}

// Resolve every identity before writing; never choose among duplicates.
function single(items, what) {
  if (items.length > 1)
    throw new Error(`More than one ${what}; refusing to guess.`)
  return items[0]
}

const accounts = await cf('GET', '/accounts?per_page=50')
if (accounts.length !== 1)
  throw new Error(`Token sees ${accounts.length} accounts; expected 1.`)
const account = accounts[0].id
const providers = await cf(
  'GET',
  `/accounts/${account}/access/identity_providers?per_page=50`,
)
const otp = single(
  providers.filter((p) => p.type === 'onetimepin'),
  'one-time PIN provider',
)
if (!otp)
  throw new Error(
    'No email one-time PIN login; run access:setup in lionfeather-edge.',
  )
const policies = await cf(
  'GET',
  `/accounts/${account}/access/policies?per_page=100`,
)
const apps = await cf('GET', `/accounts/${account}/access/apps?per_page=100`)
const existingPolicy = single(
  policies.filter((p) => p.name === policyName),
  `policy named ${policyName}`,
)
const existingApp = single(
  apps.filter((a) => a.domain === appDomain),
  `Access app on ${appDomain}`,
)

const policyBody = {
  name: policyName,
  decision: 'allow',
  include: [{ email: { email: owner } }],
  exclude: [],
  require: [],
  session_duration: session,
}
const policy = existingPolicy
  ? await cf(
      'PUT',
      `/accounts/${account}/access/policies/${existingPolicy.id}`,
      policyBody,
    )
  : await cf('POST', `/accounts/${account}/access/policies`, policyBody)

const appBody = {
  name: appName,
  type: 'self_hosted',
  domain: appDomain,
  session_duration: session,
  allowed_idps: [otp.id],
  auto_redirect_to_identity: true,
  app_launcher_visible: false,
  policies: [{ id: policy.id, precedence: 1 }],
}
const app = existingApp
  ? await cf(
      'PUT',
      `/accounts/${account}/access/apps/${existingApp.id}`,
      appBody,
    )
  : await cf('POST', `/accounts/${account}/access/apps`, appBody)

console.log(
  `${existingApp ? 'Updated' : 'Created'} ${appName} on ${appDomain} for ${owner}.`,
)
console.log(`ACCESS_AUD=${app.aud}`)
