import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { after, before, beforeEach, test } from 'node:test'
import {
  browserAgent,
  loadModule,
  startWorker,
  withAudience,
} from './worker-harness.mjs'

let worker
let limits
before(async () => {
  worker = await startWorker({ bindings: withAudience })
  limits = (await loadModule('src/analytics/analyticsContract.ts'))
    .collectLimits
})
after(() => worker.dispose())
beforeEach(() => worker.db.prepare('DELETE FROM events').run())

const events = async () =>
  (await worker.db.prepare('SELECT * FROM events ORDER BY id').all()).results
const view = { kind: 'view', path: '/' }

test('a view is stored with a coarse device class and nothing identifying', async () => {
  const before = Date.now()
  const response = await worker.beacon(
    {
      kind: 'view',
      path: '/writing/agent-sessions?utm_source=x#top',
      referrer: 'https://News.YCombinator.com/item?id=1',
      source: 'HN',
    },
    { 'cf-connecting-ip': '203.0.113.9' },
    { cf: { country: 'DE' } },
  )
  assert.equal(response.status, 204)
  assert.equal(await response.text(), '')

  const [row, ...rest] = await events()
  assert.equal(rest.length, 0)
  assert.equal(row.kind, 'view')
  assert.equal(row.path, '/writing/agent-sessions')
  assert.equal(row.referrer, 'news.ycombinator.com')
  assert.equal(row.source, 'hn')
  assert.equal(row.country, 'DE')
  assert.equal(row.device, 'desktop')
  assert.equal(row.browser, 'Chrome')
  assert.match(row.visitor, /^[0-9a-f]{16}$/)
  assert.equal(row.name, null)
  assert.equal(row.target, null)
  assert.equal(row.engaged_ms, null)
  assert.ok(row.ts >= before && row.ts <= Date.now())
  assert.equal(row.day, new Date(row.ts).toISOString().slice(0, 10))

  // Neither the address nor the browser string is stored anywhere.
  const everything = JSON.stringify([
    row,
    ...(await worker.db.prepare('SELECT * FROM salts').all()).results,
    ...(await worker.db.prepare('SELECT * FROM settings').all()).results,
  ])
  assert.ok(!everything.includes('203.0.113.9'))
  assert.ok(!everything.includes('Mozilla'))
})

test('engage and event beacons are stored with their own fields', async () => {
  assert.equal(
    (
      await worker.beacon({
        kind: 'engage',
        path: '/work/fieldwork',
        ms: 45000,
      })
    ).status,
    204,
  )
  assert.equal(
    (
      await worker.beacon({
        kind: 'event',
        path: '/',
        name: 'outbound',
        target: 'github.com',
      })
    ).status,
    204,
  )
  assert.equal(
    (await worker.beacon({ kind: 'event', path: '/', name: 'resume' })).status,
    204,
  )
  const [engage, outbound, resume] = await events()
  assert.deepEqual(
    [engage.kind, engage.path, engage.engaged_ms, engage.name],
    ['engage', '/work/fieldwork', 45000, null],
  )
  assert.deepEqual(
    [outbound.kind, outbound.name, outbound.target, outbound.engaged_ms],
    ['event', 'outbound', 'github.com', null],
  )
  assert.deepEqual([resume.name, resume.target], ['resume', null])
})

test('application/json bodies are accepted like text/plain', async () => {
  const response = await worker.beacon(view, {
    'content-type': 'application/json',
  })
  assert.equal(response.status, 204)
  assert.equal((await events()).length, 1)
})

test('the visitor id hashes the day salt, address and browser, and is stable within a day', async () => {
  const send = (ip, agent = browserAgent) =>
    worker.beacon(view, { 'cf-connecting-ip': ip, 'user-agent': agent })
  await send('198.51.100.1')
  await send('198.51.100.1')
  await send('198.51.100.2')
  await send('198.51.100.1', `${browserAgent} Edg/130.0`)
  const [first, again, otherIp, otherAgent] = await events()
  assert.equal(first.visitor, again.visitor)
  assert.notEqual(first.visitor, otherIp.visitor)
  assert.notEqual(first.visitor, otherAgent.visitor)

  const { salt } = await worker.db
    .prepare('SELECT salt FROM salts WHERE day = ?1')
    .bind(first.day)
    .first()
  const expected = createHash('sha256')
    .update(`${salt}|198.51.100.1|${browserAgent}`)
    .digest('hex')
    .slice(0, 16)
  assert.equal(first.visitor, expected)
  // Without the salt the same inputs give a different id.
  const unsalted = createHash('sha256')
    .update(`198.51.100.1|${browserAgent}`)
    .digest('hex')
  assert.notEqual(first.visitor, unsalted.slice(0, 16))
})

const bots = {
  Googlebot:
    'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
  curl: 'curl/8.4.0',
  'python-requests': 'python-requests/2.31.0',
  'headless Chrome': browserAgent.replace('Chrome/', 'HeadlessChrome/'),
  Lighthouse: `${browserAgent} Chrome-Lighthouse`,
  'empty agent': '',
}
for (const [name, agent] of Object.entries(bots)) {
  test(`a ${name} beacon is dropped silently`, async () => {
    const response = await worker.beacon(view, { 'user-agent': agent })
    assert.equal(response.status, 204)
    assert.deepEqual(await events(), [])
  })
}

const dropped = {
  'another origin': { origin: 'https://evil.example' },
  'a lookalike origin': { origin: 'https://lionfeather.dev.evil.example' },
  'the http scheme': { origin: 'http://lionfeather.dev' },
  'no origin': { origin: null },
  'a cross-site fetch': { 'sec-fetch-site': 'cross-site' },
  'a same-site fetch': { 'sec-fetch-site': 'same-site' },
  'a navigation fetch': { 'sec-fetch-site': 'none' },
  'a browser sending Global Privacy Control': { 'sec-gpc': '1' },
  'a browser sending Do Not Track': { dnt: '1' },
}
for (const [name, headers] of Object.entries(dropped)) {
  test(`a beacon from ${name} is dropped silently`, async () => {
    const response = await worker.beacon(view, headers)
    assert.equal(response.status, 204)
    assert.deepEqual(await events(), [])
  })
}

test('a same-origin fetch metadata header is accepted', async () => {
  const response = await worker.beacon(view, {
    'sec-fetch-site': 'same-origin',
  })
  assert.equal(response.status, 204)
  assert.equal((await events()).length, 1)
})

test('beacons are dropped while analytics is switched off in the settings', async () => {
  const defaults = await (await worker.admin('/admin/api/settings')).json()
  const setEnabled = (enabled) =>
    worker.admin('/admin/api/settings', {
      method: 'PUT',
      body: { settings: { ...defaults, analytics: { enabled } } },
    })
  assert.equal((await setEnabled(false)).status, 200)
  assert.equal((await worker.beacon(view)).status, 204)
  assert.deepEqual(await events(), [])
  assert.equal((await setEnabled(true)).status, 200)
  assert.equal((await worker.beacon(view)).status, 204)
  assert.equal((await events()).length, 1)
})

const malformed = {
  'invalid JSON': '{"kind":',
  'an array': '[]',
  'a string': '"view"',
  'an unknown kind': { kind: 'click', path: '/' },
  'a missing path': { kind: 'view' },
  'a path without a leading slash': { kind: 'view', path: 'writing' },
  'a path with a space': { kind: 'view', path: '/a b' },
  'a path with markup': { kind: 'view', path: '/<script>' },
  'a non-string path': { kind: 'view', path: 5 },
  'an overlong path': { kind: 'view', path: `/${'a'.repeat(200)}` },
  'an unknown event name': { kind: 'event', path: '/', name: 'purchase' },
  'a missing event name': { kind: 'event', path: '/' },
  'a target with a newline': {
    kind: 'event',
    path: '/',
    name: 'outbound',
    target: 'a\nb',
  },
  'an overlong target': {
    kind: 'event',
    path: '/',
    name: 'screenshot',
    target: 'a'.repeat(201),
  },
  'zero engaged time': { kind: 'engage', path: '/', ms: 0 },
  'negative engaged time': { kind: 'engage', path: '/', ms: -5 },
  'fractional engaged time': { kind: 'engage', path: '/', ms: 1.5 },
  'engaged time as text': { kind: 'engage', path: '/', ms: '5' },
  'engaged time over the cap': { kind: 'engage', path: '/', ms: 300001 },
}
for (const [name, body] of Object.entries(malformed)) {
  test(`${name} is rejected with 400`, async () => {
    const response = await worker.beacon(body)
    assert.equal(response.status, 400)
    assert.equal(typeof (await response.json()).error, 'string')
    assert.deepEqual(await events(), [])
  })
}

test('a body that is neither text nor JSON is rejected', async () => {
  const response = await worker.beacon(view, {
    'content-type': 'application/x-www-form-urlencoded',
  })
  assert.equal(response.status, 400)
  assert.deepEqual(await events(), [])
})

test('values at the limits are accepted', async () => {
  const longPath = `/${'a'.repeat(limits.path - 1)}`
  const bodies = [
    { kind: 'view', path: longPath, source: 'a'.repeat(limits.source) },
    { kind: 'engage', path: '/', ms: 1 },
    { kind: 'engage', path: '/', ms: limits.engageMs },
    {
      kind: 'event',
      path: '/',
      name: 'screenshot',
      target: 'a'.repeat(limits.target),
    },
  ]
  for (const body of bodies)
    assert.equal((await worker.beacon(body)).status, 204)
  assert.equal((await events()).length, bodies.length)
})

test('oversize bodies get 413 and nothing is stored', async () => {
  const padded = (size) => {
    const base = JSON.stringify({ ...view, pad: '' })
    return JSON.stringify({ ...view, pad: 'x'.repeat(size - base.length) })
  }
  const exact = padded(limits.bodyBytes)
  assert.equal(exact.length, limits.bodyBytes)
  assert.equal((await worker.beacon(exact)).status, 204)
  assert.equal((await events()).length, 1)

  const over = await worker.beacon(padded(limits.bodyBytes + 1))
  assert.equal(over.status, 413)
  assert.equal(typeof (await over.json()).error, 'string')
  assert.equal((await events()).length, 1)
})

test('only POST is allowed', async () => {
  const response = await worker.send('/api/collect')
  assert.equal(response.status, 405)
  assert.equal(response.headers.get('allow'), 'POST')
})

test('a browser family is recorded for Edge and Firefox', async () => {
  const edge = `${browserAgent} Edg/130.0.2849.46`
  const firefox =
    'Mozilla/5.0 (X11; Linux x86_64; rv:131.0) Gecko/20100101 Firefox/131.0'
  await worker.beacon(view, { 'user-agent': edge })
  await worker.beacon(view, { 'user-agent': firefox })
  assert.deepEqual(
    (await events()).map((row) => row.browser),
    ['Edge', 'Firefox'],
  )
})

test('a view keeps counting when its referrer or source does not validate', async () => {
  const shaky = [
    { referrer: 'not a host!' },
    { referrer: 5 },
    { source: 'social media' },
    { source: 'a'.repeat(limits.source + 1) },
  ]
  for (const attribution of shaky) {
    const response = await worker.beacon({ ...view, ...attribution })
    assert.equal(response.status, 204, JSON.stringify(attribution))
  }
  const rows = await events()
  assert.equal(rows.length, shaky.length)
  for (const row of rows) {
    assert.equal(row.kind, 'view')
    assert.equal(row.referrer, null)
    assert.equal(row.source, null)
  }
})
