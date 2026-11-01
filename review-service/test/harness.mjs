import http from 'node:http'
import { createAccessVerifier } from '../src/access/access-verifier.mjs'
import { createModelCatalog } from '../src/claude/model-catalog.mjs'
import { createReviewer } from '../src/claude/reviewer.mjs'
import { listen, createReviewServer } from '../src/http/server.mjs'
import {
  createSigningKey,
  jwksFor,
  signToken,
  teamDomain,
} from '../../scripts/access-token-fixture.mjs'

// Starts the real server on an ephemeral port with an injected fake SDK and a
// test signing key standing in for Cloudflare Access.
export const config = {
  teamDomain,
  audience: 'review-audience',
  clientId: 'worker-client-id',
  publicHost: 'review.lionfeather.dev',
  port: 4331,
}
export const signingKey = await createSigningKey('test-key')
export const validToken = (options = {}) =>
  signToken(signingKey, {
    audience: config.audience,
    ...options,
    claims: { common_name: config.clientId, ...options.claims },
  })

export async function startService({
  sdk,
  route,
  verifierNow,
  fetchKeys,
  catalogNow,
} = {}) {
  const resolveExecutable = () => '/fixture/claude'
  const deps = { query: sdk.query, cwd: '/tmp', resolveExecutable }
  const server = createReviewServer({
    config,
    verifyAccess: createAccessVerifier({
      ...config,
      fetchKeys: fetchKeys ?? (async () => jwksFor(signingKey).keys),
      now: verifierNow,
    }),
    catalog: createModelCatalog({ ...deps, now: catalogNow }),
    review: createReviewer(deps),
    route,
  })
  const port = await listen(server, 0)
  const close = () => {
    server.closeAllConnections()
    return new Promise((resolve) => server.close(resolve))
  }
  return { port, close }
}

/** Sends a request; `token` and `host` default to a valid Access token and the public host. */
export async function send(
  port,
  path,
  { method = 'GET', body, token, host, headers = {} } = {},
) {
  const jwt = token === undefined ? await validToken() : token
  const payload =
    body === undefined
      ? undefined
      : typeof body === 'string'
        ? body
        : JSON.stringify(body)
  const { response, request } = await open(port, path, {
    method,
    payload,
    headers: {
      host: host ?? config.publicHost,
      ...(jwt ? { 'cf-access-jwt-assertion': jwt } : {}),
      ...(payload ? { 'content-type': 'application/json' } : {}),
      ...headers,
    },
  })
  let text = ''
  for await (const chunk of response) text += chunk
  // A server may answer (413) before the upload ends; let the client finish
  // writing so the test cannot end, and tear the socket down, mid-upload.
  if (!request.writableFinished) {
    await new Promise((resolve) => {
      request.once('finish', resolve)
      request.once('error', resolve)
      request.once('close', resolve)
    })
  }
  return {
    status: response.statusCode,
    headers: response.headers,
    text,
    json: () => JSON.parse(text),
    request,
  }
}

function open(port, path, { method, payload, headers }) {
  return new Promise((resolve, reject) => {
    const request = http.request(
      { host: '127.0.0.1', port, path, method, headers },
      (response) => {
        // After the response starts, a late socket error (the server hung up
        // on a large upload, or a test aborts) is not a request failure.
        request.on('error', () => {})
        resolve({ response, request })
      },
    )
    request.on('error', reject)
    request.end(payload)
  })
}

/** Starts a streaming review; read lines with next(), or hang up with abort(). */
export async function startReview(port, body, { token } = {}) {
  const jwt = token === undefined ? await validToken() : token
  const payload = JSON.stringify(body)
  const { response, request } = await open(port, '/review', {
    method: 'POST',
    payload,
    headers: {
      host: config.publicHost,
      'cf-access-jwt-assertion': jwt,
      'content-type': 'application/json',
    },
  })
  let buffer = ''
  const lines = []
  let ended = false
  let wake
  response.setEncoding('utf8')
  response.on('data', (chunk) => {
    buffer += chunk
    let newline
    while ((newline = buffer.indexOf('\n')) >= 0) {
      lines.push(JSON.parse(buffer.slice(0, newline)))
      buffer = buffer.slice(newline + 1)
    }
    wake?.()
  })
  response.on('end', () => {
    ended = true
    wake?.()
  })
  response.on('error', () => {
    ended = true
    wake?.()
  })
  return {
    status: response.statusCode,
    headers: response.headers,
    abort: () => request.destroy(),
    async next() {
      while (!lines.length && !ended)
        await new Promise((resolve) => (wake = resolve))
      return lines.shift()
    },
    async all() {
      const out = []
      for (let line = await this.next(); line; line = await this.next())
        out.push(line)
      return out
    },
  }
}

export const article = {
  title: 'Reading CAN frames',
  dek: 'How the dashboard decodes vehicle traffic.',
  tags: ['CAN', 'Python'],
  published: '2026-10-31',
  markdown:
    'The decoder reads every frame.\n\nIt was tested in production on one van.',
}
export const reviewBody = (overrides = {}) => ({
  model: 'fable',
  effort: 'high',
  article,
  previous: null,
  ...overrides,
})
