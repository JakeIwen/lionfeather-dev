// Runs the real Worker in workerd through Miniflare, the way `wrangler dev`
// does: the repo's wrangler.jsonc supplies bindings, vars, the D1 database and
// the run_worker_first routing; the assets come from a small fixture dist.
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { build } from 'esbuild'
import {
  convertV4MiniflareOptions,
  Miniflare,
  Response as MiniflareResponse,
} from 'miniflare'
import { unstable_getMiniflareWorkerOptions } from 'wrangler'
import {
  certsUrl,
  createSigningKey,
  jwksFor,
  ownerEmail,
  signToken,
  testAudience,
} from './access-token-fixture.mjs'

const root = fileURLToPath(new URL('../', import.meta.url))
export const siteOrigin = 'https://lionfeather.dev'
export const reviewServiceUrl = 'https://review.lionfeather.dev'
export const browserAgent =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'

const page = (title, meta = '') =>
  `<!doctype html><html lang="en"><head><meta charset="UTF-8"><title>${title}</title>${meta}<link rel="stylesheet" href="/assets/app-12345678.css"></head><body><div id="root"></div></body></html>`

// The metadata tags the prerender writes into an article page's head.
const articleMeta = [
  '<meta name="description" content="Fixture summary" />',
  '<meta property="og:title" content="Fixture article · Jacob Iwen" />',
  '<meta property="og:description" content="Fixture summary" />',
  '<meta property="article:published_time" content="2026-10-21" />',
].join('')

/** A dist with three pages, a hashed asset, a plain file and the real _headers. */
function writeFixtureDist(directory) {
  mkdirSync(join(directory, 'assets'), { recursive: true })
  writeFileSync(join(directory, 'index.html'), page('Fixture home'))
  writeFileSync(join(directory, 'writing.html'), page('Fixture writing'))
  mkdirSync(join(directory, 'writing'))
  writeFileSync(
    join(directory, 'writing/agent-sessions.html'),
    page('Fixture article · Jacob Iwen', articleMeta),
  )
  writeFileSync(join(directory, 'assets/app-12345678.css'), 'body{margin:0}')
  writeFileSync(
    join(directory, 'theme.js'),
    'document.documentElement.dataset.ready = "1"',
  )
  writeFileSync(join(directory, 'feed.xml'), '<rss version="2.0"></rss>')
  cpSync(join(root, 'public/_headers'), join(directory, '_headers'))
}

/** Applies migrations/*.sql in order, one statement at a time. */
async function migrate(db) {
  const directory = join(root, 'migrations')
  for (const file of readdirSync(directory).sort()) {
    const sql = readFileSync(join(directory, file), 'utf8')
      .split('\n')
      .filter((line) => !line.trim().startsWith('--'))
      .join('\n')
    for (const statement of sql.split(';').map((part) => part.trim()))
      if (statement) await db.prepare(statement).run()
  }
}

async function bundleWorker(main) {
  const result = await build({
    entryPoints: [main],
    bundle: true,
    write: false,
    format: 'esm',
    target: 'es2022',
    platform: 'neutral',
    conditions: ['workerd', 'worker', 'browser'],
    outfile: 'worker.js',
    logLevel: 'silent',
  })
  return result.outputFiles[0].text
}

/**
 * Imports a TypeScript module from the repo into Node, for pure functions
 * (the shared contract, user-agent classes) that are clearer to test directly.
 */
export async function loadModule(relativePath) {
  const directory = mkdtempSync(join(tmpdir(), 'lionfeather-module-'))
  try {
    const result = await build({
      entryPoints: [join(root, relativePath)],
      bundle: true,
      write: false,
      format: 'esm',
      platform: 'node',
      logLevel: 'silent',
      outfile: 'module.mjs',
    })
    const file = join(directory, 'module.mjs')
    writeFileSync(file, result.outputFiles[0].text)
    return await import(pathToFileURL(file).href)
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
}

/** Wrangler's worker options for this repo, pointed at a fixture dist. */
function configuredWorker(distDirectory) {
  const { workerOptions, main } = unstable_getMiniflareWorkerOptions(
    join(root, 'wrangler.jsonc'),
    undefined,
    { overrides: { assets: { directory: distDirectory } } },
  )
  // The bundle is one module, so wrangler's rules for importing text and wasm
  // files (which Miniflare 5 rejects) have nothing to apply to.
  const { modulesRules: _modulesRules, ...options } = workerOptions
  return { options, main }
}

/**
 * Serves the Access signing keys the way Cloudflare does, and hands requests
 * for the review service to `reviewService` when a test gives one. The
 * Worker must not call out anywhere else.
 */
function accessKeysService(signingKey, requests, available, reviewService) {
  return (request) => {
    if (reviewService && request.url.startsWith(reviewServiceUrl))
      return reviewService(request)
    if (request.url !== certsUrl)
      return new MiniflareResponse('Unexpected outbound request', {
        status: 502,
      })
    requests.push(request.url)
    return available
      ? MiniflareResponse.json(jwksFor(signingKey))
      : new MiniflareResponse('Unavailable', { status: 503 })
  }
}

/** Requests as the site's own browser and the signed-in owner make them. */
function clientFor(miniflare, signingKey, bindings) {
  const send = (path, init) =>
    miniflare.dispatchFetch(new URL(path, siteOrigin), init)
  return {
    send,
    /**
     * A beacon as the site's own browser would send it; a null header value
     * leaves that header out.
     */
    beacon: (body, headers = {}, init = {}) =>
      send('/api/collect', {
        ...init,
        method: 'POST',
        headers: Object.fromEntries(
          Object.entries({
            origin: siteOrigin,
            'user-agent': browserAgent,
            'content-type': 'text/plain;charset=UTF-8',
            ...headers,
          }).filter(([, value]) => value !== null),
        ),
        body: typeof body === 'string' ? body : JSON.stringify(body),
      }),
    /** An admin API call carrying the owner's Access token. */
    admin: async (path, { method = 'GET', body } = {}) =>
      send(path, {
        method,
        headers: {
          'Cf-Access-Jwt-Assertion': await signToken(signingKey, {
            audience: bindings.ACCESS_AUD ?? testAudience,
          }),
          ...(method === 'GET' ? {} : { origin: siteOrigin }),
          ...(body === undefined ? {} : { 'content-type': 'application/json' }),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      }),
  }
}

/**
 * Starts the Worker with a fresh in-memory D1. `bindings` overrides
 * wrangler.jsonc vars (the checked-in ACCESS_AUD is empty, so tests that want
 * a working admin set it). `assets`, a function, replaces the fixture assets so
 * a test can see what the Worker asks of them. `reviewService`, a function,
 * answers the Worker's calls to the review service.
 */
export async function startWorker({
  bindings = {},
  withAccessKeys = true,
  assets,
  reviewService,
} = {}) {
  const workDirectory = mkdtempSync(join(tmpdir(), 'lionfeather-worker-'))
  const distDirectory = join(workDirectory, 'dist')
  writeFixtureDist(distDirectory)
  const { options, main } = configuredWorker(distDirectory)
  const signingKey = await createSigningKey('test-key')
  const certsRequests = []
  const miniflare = new Miniflare(
    convertV4MiniflareOptions({
      workers: [
        {
          ...options,
          modules: true,
          script: await bundleWorker(main),
          bindings: { ...options.bindings, ...bindings },
          ...(assets && {
            assets: undefined,
            serviceBindings: { ASSETS: assets },
          }),
          outboundService: accessKeysService(
            signingKey,
            certsRequests,
            withAccessKeys,
            reviewService,
          ),
        },
      ],
    }),
  )
  const db = await miniflare.getD1Database('DB')
  await migrate(db)
  return {
    miniflare,
    db,
    signingKey,
    certsRequests,
    ...clientFor(miniflare, signingKey, bindings),
    async dispose() {
      await miniflare.dispose()
      rmSync(workDirectory, { recursive: true, force: true })
    },
  }
}

export { ownerEmail, signToken, testAudience }
export const withAudience = { ACCESS_AUD: testAudience }
