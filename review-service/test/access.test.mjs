import test from 'node:test'
import assert from 'node:assert/strict'
import { loadConfig } from '../src/config.mjs'
import {
  createSigningKey,
  jwksFor,
  signToken,
} from '../../scripts/access-token-fixture.mjs'
import {
  config,
  signingKey,
  send,
  startService,
  validToken,
} from './harness.mjs'
import { createFakeSdk } from './fake-sdk.mjs'

async function withService(t, options = {}) {
  const service = await startService({ sdk: createFakeSdk(), ...options })
  t.after(service.close)
  return service.port
}

test('/healthz answers without a token or the public Host', async (t) => {
  const port = await withService(t)
  const response = await send(port, '/healthz', {
    token: null,
    host: '127.0.0.1:4331',
  })
  assert.equal(response.status, 200)
  assert.deepEqual(response.json(), { ok: true })
})

test('every other route rejects a request with no Access token', async (t) => {
  const port = await withService(t)
  for (const [path, method] of [
    ['/models', 'GET'],
    ['/review', 'POST'],
    ['/nope', 'GET'],
  ]) {
    const response = await send(port, path, {
      method,
      token: null,
      body: method === 'POST' ? {} : undefined,
    })
    assert.equal(response.status, 401, path)
  }
})

test('a valid token on the wrong Host is refused', async (t) => {
  const port = await withService(t)
  for (const host of [
    'evil.example.com',
    '127.0.0.1:4331',
    'review.lionfeather.dev.evil.com',
  ]) {
    assert.equal((await send(port, '/models', { host })).status, 403, host)
  }
  assert.equal(
    (await send(port, '/models', { host: 'Review.Lionfeather.dev:443' }))
      .status,
    200,
  )
})

test('tokens that are forged, expired, early or meant for someone else are rejected', async (t) => {
  const port = await withService(t)
  const other = await createSigningKey('test-key')
  const now = Math.floor(Date.now() / 1000)
  const cases = {
    'signed by another key': await signToken(other, {
      audience: config.audience,
      claims: { common_name: config.clientId },
    }),
    expired: await validToken({ claims: { exp: now - 3600 } }),
    'not yet valid': await validToken({ claims: { nbf: now + 3600 } }),
    'wrong audience': await validToken({ audience: 'another-app' }),
    'wrong service token': await validToken({
      claims: { common_name: 'someone-else' },
    }),
    'owner login instead of a service token': await signToken(signingKey, {
      audience: config.audience,
      claims: { email: 'lionfeatherdev@gmail.com' },
    }),
    'wrong issuer': await validToken({
      claims: { iss: 'https://evil.cloudflareaccess.com' },
    }),
    'unsigned algorithm': (await validToken()).replace(
      /^[^.]+/,
      Buffer.from('{"alg":"none","kid":"test-key"}').toString('base64url'),
    ),
    'unknown key id': await validToken({ header: { kid: 'missing' } }),
    garbage: 'not-a-jwt',
  }
  for (const [name, token] of Object.entries(cases)) {
    const response = await send(port, '/models', { token })
    assert.equal(response.status, 401, name)
    assert.doesNotMatch(response.text, /audience|signature|expired/i, name)
  }
  assert.equal((await send(port, '/models')).status, 200)
})

test('a rotated Access key is picked up, but unknown key ids cannot force a refetch every request', async (t) => {
  let clock = Date.now()
  const rotated = await createSigningKey('rotated')
  let keys = jwksFor(signingKey).keys
  let fetches = 0
  const port = await withService(t, {
    verifierNow: () => clock,
    fetchKeys: async () => {
      fetches++
      return keys
    },
  })
  const rotatedToken = () =>
    signToken(rotated, {
      audience: config.audience,
      claims: { common_name: config.clientId },
    })
  assert.equal((await send(port, '/models')).status, 200)
  assert.equal(fetches, 1)
  keys = jwksFor(signingKey, rotated).keys
  // Too soon after the last fetch: the unknown key is refused without another request to Cloudflare.
  assert.equal(
    (await send(port, '/models', { token: await rotatedToken() })).status,
    401,
  )
  assert.equal(fetches, 1)
  clock += 61_000
  assert.equal(
    (await send(port, '/models', { token: await rotatedToken() })).status,
    200,
  )
  assert.equal(fetches, 2)
})

test('unknown paths and methods are rejected only after authentication', async (t) => {
  const port = await withService(t)
  assert.equal((await send(port, '/nope')).status, 404)
  assert.equal((await send(port, '/review')).status, 405)
  assert.equal(
    (await send(port, '/models', { method: 'POST', body: {} })).status,
    405,
  )
})

test('configuration fails closed when any setting is empty', () => {
  const good = {
    ACCESS_TEAM_DOMAIN: 'proud-base-5e35.cloudflareaccess.com',
    ACCESS_AUD: 'aud',
    ACCESS_CLIENT_ID: 'client',
    PORT: '4331',
    PUBLIC_HOST: 'review.lionfeather.dev',
  }
  assert.equal(loadConfig(good).port, 4331)
  for (const name of Object.keys(good)) {
    assert.throws(() => loadConfig({ ...good, [name]: '' }), new RegExp(name))
    assert.throws(
      () => loadConfig({ ...good, [name]: '   ' }),
      new RegExp(name),
    )
  }
  assert.throws(() => loadConfig({ ...good, PORT: 'abc' }), /PORT/)
  assert.throws(
    () => loadConfig({ ...good, PUBLIC_HOST: 'a b/c' }),
    /PUBLIC_HOST/,
  )
})
