import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import {
  certsUrl,
  createSigningKey,
  teamDomain,
} from './access-token-fixture.mjs'
import {
  loadModule,
  ownerEmail,
  signToken,
  siteOrigin,
  startWorker,
  testAudience,
  withAudience,
} from './worker-harness.mjs'

let worker
let adminApi
before(async () => {
  worker = await startWorker({ bindings: withAudience })
  adminApi = (await loadModule('src/routes.ts')).adminApi
})
after(() => worker.dispose())

const getSession = (token) =>
  worker.send(adminApi.session, {
    headers: token === undefined ? {} : { 'Cf-Access-Jwt-Assertion': token },
  })
const unauthorized = async (token) => {
  const response = await getSession(token)
  assert.equal(response.status, 401)
  assert.equal(response.headers.get('cache-control'), 'no-store')
  assert.equal(typeof (await response.json()).error, 'string')
}
const now = () => Math.floor(Date.now() / 1000)

test('the owner reaches the API; responses are JSON and never cached', async () => {
  const response = await getSession(await signToken(worker.signingKey))
  assert.equal(response.status, 200)
  assert.equal(response.headers.get('cache-control'), 'no-store')
  assert.match(response.headers.get('content-type'), /^application\/json/)
  assert.deepEqual(await response.json(), { email: ownerEmail })
})

test('the email is compared case-insensitively', async () => {
  const token = await signToken(worker.signingKey, {
    claims: { email: ownerEmail.toUpperCase() },
  })
  assert.equal((await getSession(token)).status, 200)
})

test('the Access signing keys are fetched once and cached', async () => {
  const token = await signToken(worker.signingKey)
  await getSession(token)
  const fetched = worker.certsRequests.length
  assert.ok(fetched >= 1)
  for (let i = 0; i < 3; i++)
    assert.equal((await getSession(token)).status, 200)
  assert.equal(worker.certsRequests.length, fetched)
  assert.deepEqual(new Set(worker.certsRequests), new Set([certsUrl]))
})

test('a request without a token is refused', () => unauthorized(undefined))
test('garbage is refused', () => unauthorized('not-a-token'))
test('an empty token is refused', () => unauthorized(''))

test('a token for someone else is refused', async () => {
  await unauthorized(
    await signToken(worker.signingKey, {
      claims: { email: 'visitor@example.com' },
    }),
  )
})
test('a token without an email is refused', async () => {
  await unauthorized(
    await signToken(worker.signingKey, { claims: { email: undefined } }),
  )
})
test('a token for another Access application is refused', async () => {
  await unauthorized(
    await signToken(worker.signingKey, { audience: 'another-app' }),
  )
})
test('a token from another issuer is refused', async () => {
  await unauthorized(
    await signToken(worker.signingKey, {
      claims: { iss: 'https://evil.cloudflareaccess.com' },
    }),
  )
})
test('an expired token is refused', async () => {
  await unauthorized(
    await signToken(worker.signingKey, { claims: { exp: now() - 3600 } }),
  )
})
test('a token that is not valid yet is refused', async () => {
  await unauthorized(
    await signToken(worker.signingKey, {
      claims: { nbf: now() + 3600, iat: now() + 3600 },
    }),
  )
})
test('a token signed by a different key is refused', async () => {
  const forger = await createSigningKey(worker.signingKey.kid)
  await unauthorized(await signToken(forger))
})
test('a token naming an unknown key is refused', async () => {
  const stranger = await createSigningKey('stranger')
  await unauthorized(await signToken(stranger))
})
test('a token with a tampered payload is refused', async () => {
  const [header, , signature] = (await signToken(worker.signingKey)).split('.')
  const payload = Buffer.from(
    JSON.stringify({
      iss: `https://${teamDomain}`,
      aud: [testAudience],
      email: 'visitor@example.com',
      iat: now() - 10,
      exp: now() + 3600,
    }),
  ).toString('base64url')
  await unauthorized(`${header}.${payload}.${signature}`)
})
test('unsigned and symmetric algorithms are refused', async () => {
  for (const alg of ['none', 'HS256']) {
    await unauthorized(await signToken(worker.signingKey, { header: { alg } }))
  }
  const [, payload] = (await signToken(worker.signingKey)).split('.')
  const none = Buffer.from(
    JSON.stringify({ alg: 'none', typ: 'JWT' }),
  ).toString('base64url')
  await unauthorized(`${none}.${payload}.`)
})

test('every admin path is checked before it is looked up', async () => {
  for (const [method, path] of [
    ['GET', '/admin/api/nonexistent'],
    ['GET', adminApi.settings],
    ['DELETE', adminApi.appearanceTheme('x')],
  ]) {
    const response = await worker.send(path, {
      method,
      headers: { origin: siteOrigin },
    })
    assert.equal(response.status, 401, `${method} ${path}`)
  }
})

test('writes must come from the site itself', async () => {
  const token = await signToken(worker.signingKey)
  const attempt = (origin) =>
    worker.send(adminApi.settings, {
      method: 'PUT',
      headers: {
        'Cf-Access-Jwt-Assertion': token,
        'content-type': 'application/json',
        ...(origin ? { origin } : {}),
      },
      body: JSON.stringify({ settings: {} }),
    })
  for (const origin of [
    'https://evil.example',
    'http://lionfeather.dev',
    undefined,
  ]) {
    const response = await attempt(origin)
    assert.equal(response.status, 403, String(origin))
    assert.equal(typeof (await response.json()).error, 'string')
  }
  const del = await worker.send(adminApi.appearanceTheme('x'), {
    method: 'DELETE',
    headers: {
      'Cf-Access-Jwt-Assertion': token,
      origin: 'https://evil.example',
    },
  })
  assert.equal(del.status, 403)
})

test('unknown paths are 404 and wrong methods are 405 once signed in', async () => {
  const missing = await worker.admin('/admin/api/nonexistent')
  assert.equal(missing.status, 404)
  assert.equal(typeof (await missing.json()).error, 'string')
  const wrong = await worker.admin(adminApi.session, { method: 'DELETE' })
  assert.equal(wrong.status, 405)
  assert.equal(wrong.headers.get('allow'), 'GET')
  const noPut = await worker.admin(adminApi.metrics, {
    method: 'PUT',
    body: {},
  })
  assert.equal(noPut.status, 405)
})

test('malformed and oversize admin bodies are rejected', async () => {
  const token = await signToken(worker.signingKey)
  const put = (body) =>
    worker.send(adminApi.settings, {
      method: 'PUT',
      headers: { 'Cf-Access-Jwt-Assertion': token, origin: siteOrigin },
      body,
    })
  assert.equal((await put('{"settings":')).status, 400)
  assert.equal((await put('')).status, 400)
  assert.equal(
    (await put(JSON.stringify({ settings: 'x'.repeat(70 * 1024) }))).status,
    413,
  )
})

test('the checked-in configuration refuses everyone until ACCESS_AUD is set', async (t) => {
  const unconfigured = await startWorker()
  t.after(() => unconfigured.dispose())
  // A valid owner token for the audience a real Access app would have.
  for (const audience of [testAudience, '']) {
    const token = await signToken(unconfigured.signingKey, { audience })
    const response = await unconfigured.send(adminApi.session, {
      headers: { 'Cf-Access-Jwt-Assertion': token },
    })
    assert.equal(response.status, 401, `aud ${JSON.stringify(audience)}`)
  }
})

test('admin requests fail closed when the Access keys are unreachable', async (t) => {
  const offline = await startWorker({
    bindings: withAudience,
    withAccessKeys: false,
  })
  t.after(() => offline.dispose())
  const response = await offline.admin(adminApi.session)
  assert.equal(response.status, 401)
})
