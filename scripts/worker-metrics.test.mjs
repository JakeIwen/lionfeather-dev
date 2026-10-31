import assert from 'node:assert/strict'
import { after, before, beforeEach, test } from 'node:test'
import { loadModule, startWorker, withAudience } from './worker-harness.mjs'

const dayMs = 24 * 60 * 60 * 1000
const utcDay = (ms) => new Date(ms).toISOString().slice(0, 10)

let worker
let adminApi
let contract
before(async () => {
  worker = await startWorker({ bindings: withAudience })
  adminApi = (await loadModule('src/routes.ts')).adminApi
  contract = await loadModule('src/analytics/analyticsContract.ts')
})
after(() => worker.dispose())
beforeEach(() => worker.db.prepare('DELETE FROM events').run())

const insert = (row) => {
  const full = {
    kind: 'view',
    path: '/',
    name: null,
    target: null,
    referrer: null,
    source: null,
    country: 'US',
    device: 'desktop',
    browser: 'Chrome',
    engaged_ms: null,
    ...row,
  }
  return worker.db
    .prepare(
      `INSERT INTO events (ts, day, visitor, kind, path, name, target, referrer, source,
         country, device, browser, engaged_ms)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)`,
    )
    .bind(
      full.ts,
      utcDay(full.ts),
      full.visitor,
      full.kind,
      full.path,
      full.name,
      full.target,
      full.referrer,
      full.source,
      full.country,
      full.device,
      full.browser,
      full.engaged_ms,
    )
}
const seed = (rows) => worker.db.batch(rows.map(insert))

const report = async (query = '') => {
  const response = await worker.admin(`${adminApi.metrics}${query}`)
  assert.equal(response.status, 200)
  return response.json()
}

// Three visitors today, one yesterday, one 8 and one 100 days ago. Seconds
// before now keep "today" rows inside the live window.
async function seedTraffic() {
  const now = Date.now()
  const ago = (seconds) => now - seconds * 1000
  const day = (days) => now - days * dayMs
  await seed([
    // A: lands directly, reads, opens another page, then the resume.
    { ts: ago(50), visitor: 'a', path: '/' },
    { ts: ago(45), visitor: 'a', kind: 'engage', path: '/', engaged_ms: 30000 },
    { ts: ago(44), visitor: 'a', kind: 'engage', path: '/', engaged_ms: 30000 },
    { ts: ago(40), visitor: 'a', path: '/work/van-dashboard' },
    {
      ts: ago(30),
      visitor: 'a',
      kind: 'event',
      path: '/work/van-dashboard',
      name: 'resume',
    },
    // B: from Hacker News on a phone in Germany.
    {
      ts: ago(35),
      visitor: 'b',
      path: '/writing',
      referrer: 'news.ycombinator.com',
      country: 'DE',
      device: 'mobile',
      browser: 'Safari',
    },
    {
      ts: ago(34),
      visitor: 'b',
      kind: 'engage',
      path: '/writing',
      engaged_ms: 20000,
    },
    {
      ts: ago(33),
      visitor: 'b',
      kind: 'event',
      path: '/writing',
      name: 'outbound',
      target: 'github.com',
    },
    {
      ts: ago(32),
      visitor: 'b',
      kind: 'event',
      path: '/writing',
      name: 'outbound',
      target: 'github.com',
    },
    {
      ts: ago(31),
      visitor: 'b',
      kind: 'event',
      path: '/writing',
      name: 'screenshot',
      target: '/images/x.png',
    },
    // C: a tagged link, country unknown, on a tablet.
    {
      ts: ago(20),
      visitor: 'c',
      path: '/',
      source: 'linkedin',
      referrer: 'lnkd.in',
      country: null,
      device: 'tablet',
      browser: 'Firefox',
    },
    // Yesterday, last week and long ago: out of the live window.
    { ts: day(1), visitor: 'a2', path: '/', browser: 'Edge' },
    { ts: day(8), visitor: 'old', path: '/old' },
    { ts: day(100), visitor: 'older', path: '/older' },
  ])
  return now
}

test('an empty database gives a zeroed report with every day present', async () => {
  const data = await report()
  assert.deepEqual(data.range.days, 7)
  assert.equal(data.daily.length, 7)
  assert.ok(data.daily.every((row) => row.views === 0 && row.visitors === 0))
  assert.deepEqual(data.totals, {
    views: 0,
    visitorDays: 0,
    engagedSeconds: 0,
    avgEngagedSeconds: 0,
    resumeOpens: 0,
    outboundClicks: 0,
  })
  for (const key of [
    'pages',
    'referrers',
    'countries',
    'devices',
    'browsers',
    'events',
    'eventTargets',
    'recent',
  ])
    assert.deepEqual(data[key], [], key)
  assert.deepEqual(data.live, { visitors: 0, pages: [] })
})

test('the week report counts views, visitors and engagement', async () => {
  const now = await seedTraffic()
  const data = await report('?days=7')
  const today = utcDay(now)

  assert.deepEqual(Object.keys(data).sort(), [
    'browsers',
    'countries',
    'daily',
    'devices',
    'eventTargets',
    'events',
    'live',
    'pages',
    'range',
    'recent',
    'referrers',
    'totals',
  ])
  assert.deepEqual(data.range, {
    days: 7,
    from: utcDay(now - 6 * dayMs),
    to: today,
  })
  assert.deepEqual(
    data.daily.map((row) => row.day),
    [6, 5, 4, 3, 2, 1, 0].map((back) => utcDay(now - back * dayMs)),
  )
  assert.deepEqual(data.daily.at(-1), { day: today, views: 4, visitors: 3 })
  assert.deepEqual(data.daily.at(-2), {
    day: utcDay(now - dayMs),
    views: 1,
    visitors: 1,
  })
  assert.deepEqual(data.totals, {
    views: 5,
    visitorDays: 4,
    engagedSeconds: 80,
    // 60s on "/" and 20s on "/writing" over five views.
    avgEngagedSeconds: 16,
    resumeOpens: 1,
    outboundClicks: 2,
  })
  assert.deepEqual(data.pages, [
    { path: '/', views: 3, visitors: 3, avgEngagedSeconds: 20 },
    {
      path: '/work/van-dashboard',
      views: 1,
      visitors: 1,
      avgEngagedSeconds: 0,
    },
    { path: '/writing', views: 1, visitors: 1, avgEngagedSeconds: 20 },
  ])
})

test('referrers prefer a source tag, then the host, and count only landing views as direct', async () => {
  await seedTraffic()
  const data = await report()
  assert.deepEqual(data.referrers, [
    // A's first view today and A2's yesterday; A's second view is navigation.
    { key: 'direct', visitors: 2, count: 2 },
    { key: 'linkedin', visitors: 1, count: 1 },
    { key: 'news.ycombinator.com', visitors: 1, count: 1 },
  ])
})

test('countries, devices and browsers are grouped by view', async () => {
  await seedTraffic()
  const data = await report()
  assert.deepEqual(data.countries, [
    { key: 'US', visitors: 2, count: 3 },
    { key: 'DE', visitors: 1, count: 1 },
    { key: 'unknown', visitors: 1, count: 1 },
  ])
  assert.deepEqual(data.devices, [
    { key: 'desktop', visitors: 2, count: 3 },
    { key: 'mobile', visitors: 1, count: 1 },
    { key: 'tablet', visitors: 1, count: 1 },
  ])
  assert.deepEqual(data.browsers, [
    { key: 'Chrome', visitors: 1, count: 2 },
    { key: 'Edge', visitors: 1, count: 1 },
    { key: 'Firefox', visitors: 1, count: 1 },
    { key: 'Safari', visitors: 1, count: 1 },
  ])
})

test('events and their targets are counted', async () => {
  await seedTraffic()
  const data = await report()
  assert.deepEqual(data.events, [
    { key: 'outbound', visitors: 1, count: 2 },
    { key: 'resume', visitors: 1, count: 1 },
    { key: 'screenshot', visitors: 1, count: 1 },
  ])
  assert.deepEqual(data.eventTargets, [
    { name: 'outbound', target: 'github.com', count: 2 },
    { name: 'screenshot', target: '/images/x.png', count: 1 },
  ])
})

test('live counts each recent visitor once, on the page they were last on', async () => {
  await seedTraffic()
  const data = await report()
  assert.deepEqual(data.live, {
    visitors: 3,
    pages: [
      { path: '/', visitors: 1 },
      { path: '/work/van-dashboard', visitors: 1 },
      { path: '/writing', visitors: 1 },
    ],
  })
})

test('recent lists the newest views first, with only the fields shown', async () => {
  const now = await seedTraffic()
  const { recent } = await report()
  assert.deepEqual(
    recent.map((row) => row.path),
    ['/', '/writing', '/work/van-dashboard', '/', '/', '/old', '/older'],
  )
  assert.deepEqual(Object.keys(recent[0]).sort(), [
    'country',
    'device',
    'path',
    'referrer',
    'ts',
  ])
  assert.equal(recent[0].ts, now - 20 * 1000)
  assert.deepEqual(recent[0], {
    ts: now - 20000,
    path: '/',
    country: null,
    device: 'tablet',
    referrer: 'lnkd.in',
  })

  const rows = Array.from({ length: 40 }, (_, i) => ({
    ts: now - 100000 - i,
    visitor: `v${i}`,
    path: `/p${i}`,
  }))
  await seed(rows)
  assert.equal((await report()).recent.length, 30)
})

test('the range selects the days: 1, 7, 30 and 90', async () => {
  const now = await seedTraffic()
  const views = async (days) => (await report(`?days=${days}`)).totals.views
  assert.equal(await views(1), 4)
  assert.equal(await views(7), 5)
  assert.equal(await views(30), 6)
  assert.equal(await views(90), 6)
  const today = await report('?days=1')
  assert.deepEqual(today.range, { days: 1, from: utcDay(now), to: utcDay(now) })
  assert.equal(today.daily.length, 1)
  // Visitors only counted once even though A viewed two pages.
  assert.equal(today.totals.visitorDays, 3)
  assert.equal((await report('?days=90')).daily.length, 90)
  assert.deepEqual((await report()).range.days, 7)
})

test('other ranges are rejected', async () => {
  for (const query of [
    '?days=5',
    '?days=0',
    '?days=-1',
    '?days=07',
    '?days=',
    '?days=all',
    '?days=7.0',
    '?days=365',
  ]) {
    const response = await worker.admin(`${adminApi.metrics}${query}`)
    assert.equal(response.status, 400, query)
    assert.match(
      (await response.json()).error,
      /days must be one of 1, 7, 30, 90/,
    )
  }
})

test('the report follows the contract for ranges and live window', () => {
  assert.deepEqual([...contract.metricsRangeDays], [1, 7, 30, 90])
  assert.equal(contract.liveWindowMs, 5 * 60 * 1000)
})

test('a visitor seen only before the live window is not live', async () => {
  const now = Date.now()
  await seed([
    { ts: now - contract.liveWindowMs - 1000, visitor: 'late', path: '/' },
    {
      ts: now - contract.liveWindowMs + 5000,
      visitor: 'fresh',
      kind: 'engage',
      path: '/writing',
      engaged_ms: 1000,
    },
  ])
  const { live } = await report()
  assert.deepEqual(live, {
    visitors: 1,
    pages: [{ path: '/writing', visitors: 1 }],
  })
})

test('beacons sent through the collect endpoint show up in the report', async () => {
  await worker.beacon({
    kind: 'view',
    path: '/writing',
    referrer: 'example.org',
  })
  await worker.beacon({ kind: 'engage', path: '/writing', ms: 12000 })
  const data = await report('?days=1')
  assert.equal(data.totals.views, 1)
  assert.equal(data.totals.engagedSeconds, 12)
  assert.deepEqual(data.referrers, [
    { key: 'example.org', visitors: 1, count: 1 },
  ])
  assert.deepEqual(data.live, {
    visitors: 1,
    pages: [{ path: '/writing', visitors: 1 }],
  })
})
