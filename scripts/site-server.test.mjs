import assert from 'node:assert/strict'
import { once } from 'node:events'
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { createServer, request } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import { build } from 'esbuild'
import {
  APP,
  HEALTH,
  STOP,
  readRecord,
  removeOwnRecord,
  startSiteServer,
} from './site-server.mjs'
import {
  articleEditsElementId,
  createLiveSiteState,
  settingsElementId,
  themeStyleElementId,
} from './live-site-state.mjs'
import {
  assertOwnedConfiguration,
  configuration,
  ownershipMatches,
  plist,
} from './service.mjs'

async function fixture(t, serverOptions = {}) {
  const root = mkdtempSync(join(tmpdir(), 'lionfeather-service-test-'))
  const dist = join(root, 'dist')
  const state = join(root, 'private-state')
  mkdirSync(join(dist, 'assets'), { recursive: true })
  writeFileSync(
    join(dist, 'index.html'),
    '<!doctype html><title>Jacob Iwen</title><script src="/assets/app-12345678.js"></script>',
  )
  writeFileSync(join(dist, 'assets/app-12345678.js'), 'console.log("public")')
  writeFileSync(join(dist, 'resume.pdf'), '%PDF-1.7\npublic resume')
  writeFileSync(
    join(root, 'AGENTS.private.md'),
    'PRIVATE_CONTENT_MUST_NOT_LEAK',
  )
  // Offline by default: the live origin is production unless a test names a stub.
  const app = await startSiteServer({
    dist,
    stateDir: state,
    port: 0,
    liveOrigin: null,
    ...serverOptions,
  })
  t.after(async () => {
    await app.close()
    rmSync(root, { recursive: true, force: true })
  })
  return { ...app, root, dist, state }
}

function raw(app, path, { method = 'GET', headers = {} } = {}) {
  return new Promise((resolve, reject) => {
    const call = request(
      { hostname: '127.0.0.1', port: app.record.port, path, method, headers },
      (response) => {
        const chunks = []
        response.on('data', (data) => chunks.push(data))
        response.on('end', () =>
          resolve({
            status: response.statusCode,
            headers: response.headers,
            body: Buffer.concat(chunks).toString(),
          }),
        )
      },
    )
    call.on('error', reject)
    call.end()
  })
}

test('serves built pages, SPA deep links, assets, and PDF HEAD without exposing the workspace', async (t) => {
  const app = await fixture(t)
  assert.equal(app.server.address().address, '127.0.0.1')
  const home = await raw(app, '/')
  assert.equal(home.status, 200)
  assert.match(home.body, /Jacob Iwen/)
  assert.equal(home.headers['cache-control'], 'no-cache')
  const route = await raw(app, '/work/fieldwork', {
    headers: { Accept: 'text/html' },
  })
  assert.equal(route.body, home.body)
  const script = await raw(app, '/assets/app-12345678.js')
  assert.equal(script.status, 200)
  assert.match(script.headers['content-type'], /javascript/)
  assert.match(script.headers['cache-control'], /immutable/)
  const pdf = await raw(app, '/resume.pdf', { method: 'HEAD' })
  assert.equal(pdf.headers['content-type'], 'application/pdf')
  assert.equal(
    Number(pdf.headers['content-length']),
    statSync(join(app.dist, 'resume.pdf')).size,
  )
  assert.equal(pdf.body, '')
  for (const path of [
    '/AGENTS.private.md',
    '/package.json',
    '/.env',
    '/.git/config',
    '/.local/service/server.json',
    '/assets/missing.js',
  ]) {
    const response = await raw(app, path, { headers: { Accept: 'text/html' } })
    assert.equal(response.status, 404, path)
    assert.doesNotMatch(response.body, /PRIVATE_CONTENT/)
  }
})

test('serves extensionless prerendered pages before the SPA fallback and serves the feed', async (t) => {
  const app = await fixture(t)
  mkdirSync(join(app.dist, 'writing'))
  const pages = {
    'writing.html': '<title>Writing index</title>',
    'writing/agent-sessions.html': '<title>Article page</title>',
  }
  for (const [file, html] of Object.entries(pages)) {
    writeFileSync(join(app.dist, file), html)
    for (const method of ['GET', 'HEAD']) {
      const response = await raw(app, `/${file.slice(0, -5)}`, { method })
      assert.equal(response.status, 200)
      assert.equal(response.headers.location, undefined)
      assert.match(response.headers['content-type'], /text\/html/)
      assert.equal(response.body, method === 'GET' ? html : '')
    }
  }
  writeFileSync(join(app.dist, 'feed.xml'), '<rss version="2.0"/>')
  const feed = await raw(app, '/feed.xml')
  assert.equal(feed.status, 200)
  assert.match(feed.headers['content-type'], /application\/rss\+xml/)
  assert.match(feed.body, /<rss/)
  symlinkSync(
    join(app.root, 'AGENTS.private.md'),
    join(app.dist, 'escape.html'),
  )
  assert.equal((await raw(app, '/escape')).status, 404)
})

test('denies traversal, malformed paths, symlinks, foreign origins and state-changing static requests', async (t) => {
  const app = await fixture(t)
  symlinkSync(
    join(app.root, 'AGENTS.private.md'),
    join(app.dist, 'private.txt'),
  )
  symlinkSync(app.root, join(app.dist, 'escape'))
  for (const path of [
    '/../AGENTS.private.md',
    '/%2e%2e/AGENTS.private.md',
    '/escape/AGENTS.private.md',
    '/private.txt',
    '/assets/%2e%2e/%2e%2e/AGENTS.private.md',
    '/%00',
  ]) {
    assert.equal((await raw(app, path)).status, 404, path)
  }
  assert.equal((await raw(app, '/%zz')).status, 400)
  assert.equal(
    (await raw(app, '/', { headers: { Host: 'example.com' } })).status,
    403,
  )
  assert.equal(
    (await raw(app, '/', { headers: { Origin: 'https://example.com' } }))
      .status,
    403,
  )
  assert.equal((await raw(app, '/', { method: 'POST' })).status, 405)
})

test('requires a private token for shutdown, never publishes it, and removes only its own record', async (t) => {
  const app = await fixture(t)
  const response = await raw(app, HEALTH)
  const health = JSON.parse(response.body)
  assert.equal(health.app, APP)
  assert.equal(health.instance, app.record.instance)
  assert.equal(health.token, undefined)
  assert.equal(health.root, undefined)
  assert.equal(statSync(join(app.state, 'server.json')).mode & 0o777, 0o600)
  assert.equal((await raw(app, STOP)).status, 405)
  for (const token of ['', 'bad', '0'.repeat(64), 'é'.repeat(64)]) {
    assert.equal(
      (
        await raw(app, STOP, {
          method: 'POST',
          headers: { 'X-Lionfeather-Control': token },
        })
      ).status,
      403,
    )
  }
  const closed = once(app.server, 'close')
  assert.equal(
    (
      await raw(app, STOP, {
        method: 'POST',
        headers: { 'X-Lionfeather-Control': app.record.token },
      })
    ).status,
    200,
  )
  await closed
  assert.equal(readRecord(app.state), null)
})

test('a failed bind does not overwrite the ownership record of the current listener', async (t) => {
  const app = await fixture(t)
  const before = readFileSync(join(app.state, 'server.json'), 'utf8')
  await assert.rejects(
    startSiteServer({
      dist: app.dist,
      stateDir: app.state,
      port: app.record.port,
      liveOrigin: null,
    }),
    { code: 'EADDRINUSE' },
  )
  assert.equal(readFileSync(join(app.state, 'server.json'), 'utf8'), before)
  assert.equal((await raw(app, '/')).status, 200)
})

test('stale cleanup cannot erase a newer process record, and rebuild output is served on the next request', async (t) => {
  const app = await fixture(t)
  writeFileSync(join(app.dist, 'index.html'), '<title>Updated site</title>')
  assert.match((await raw(app, '/')).body, /Updated site/)
  const newer = {
    ...app.record,
    instance: 'newer-instance',
    pid: app.record.pid + 1,
  }
  writeFileSync(join(app.state, 'server.json'), JSON.stringify(newer))
  removeOwnRecord(app.state, app.record.instance, app.record.pid)
  assert.deepEqual(readRecord(app.state), newer)
  await app.close()
  assert.deepEqual(readRecord(app.state), newer)
})

test('service controls reject unrelated installations and stale HTTP identities', () => {
  const config = configuration()
  assert.doesNotThrow(() => assertOwnedConfiguration(config))
  for (const altered of [
    { ...config, Label: 'com.example.unrelated' },
    { ...config, UserName: 'root' },
    { ...config, WorkingDirectory: '/tmp/unrelated' },
    { ...config, ProgramArguments: ['/usr/bin/false'] },
  ])
    assert.throws(() => assertOwnedConfiguration(altered), /Refusing/)
  assert.equal(ownershipMatches(null, { app: APP }), false)
  assert.equal(
    ownershipMatches(
      { app: APP, pid: 5, token: 'a'.repeat(64) },
      { app: APP, pid: 6 },
    ),
    false,
  )
  assert.match(plist({ text: 'a&b<c>"d' }), /a&amp;b&lt;c&gt;&quot;d/)
})

const injectedTags =
  '<style id="theme-knobs">:root{--hue-neutral:360;--hue-brand:240}</style>' +
  '<script type="application/json" id="site-settings">{"analytics":{"enabled":true}}</script>' +
  '<script type="application/json" id="article-edits">{}</script>'

// Stands in for lionfeather.dev: counts requests and answers with `handler`.
async function stubUpstream(t, handler) {
  const upstream = { requests: 0 }
  const server = createServer((req, res) => {
    upstream.requests += 1
    handler(req, res)
  })
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  t.after(() => {
    server.closeAllConnections()
    server.close()
  })
  upstream.origin = `http://127.0.0.1:${server.address().port}`
  return upstream
}

const productionPage = (res, head = injectedTags) => {
  res.writeHead(200, { 'Content-Type': 'text/html' })
  res.end(`<!doctype html><head><title>Live</title>${head}</head>`)
}

test('pages carry the live theme, settings and article edits pulled from production, cached between requests', async (t) => {
  const upstream = await stubUpstream(t, (_req, res) => productionPage(res))
  const app = await fixture(t, { liveOrigin: upstream.origin })
  // The build has a head here, as the real one does.
  writeFileSync(
    join(app.dist, 'index.html'),
    '<!doctype html><head><title>Jacob Iwen</title></head><body></body>',
  )
  const home = await raw(app, '/')
  assert.equal(home.status, 200)
  assert.ok(
    home.body.includes(`${injectedTags}</head>`),
    'tags sit at the end of the head',
  )
  assert.equal(
    Number(home.headers['content-length']),
    Buffer.byteLength(home.body),
  )
  const deepLink = await raw(app, '/work/fieldwork', {
    headers: { Accept: 'text/html' },
  })
  assert.ok(deepLink.body.includes(injectedTags))
  const head = await raw(app, '/', { method: 'HEAD' })
  assert.equal(head.headers['content-length'], home.headers['content-length'])
  assert.equal(head.body, '')
  // Assets are untouched and the three pages cost one upstream request.
  const script = await raw(app, '/assets/app-12345678.js')
  assert.equal(script.body, 'console.log("public")')
  assert.equal(upstream.requests, 1)
})

test('pages are served unchanged when production is unreachable, errs, or lacks the state', async (t) => {
  const broken = await stubUpstream(t, (_req, res) => {
    res.writeHead(500)
    res.end('boom')
  })
  const bare = await stubUpstream(t, (_req, res) => productionPage(res, ''))
  const tampered = await stubUpstream(t, (_req, res) =>
    productionPage(
      res,
      injectedTags.replace('--hue-brand:240', '--x:url(//evil.example)'),
    ),
  )
  const hangs = await stubUpstream(t, () => {})
  const originalLog = console.warn
  const logged = []
  console.warn = (message) => logged.push(message)
  t.after(() => {
    console.warn = originalLog
  })
  const cases = [
    ['http://127.0.0.1:9', {}], // nothing listens on the discard port
    [broken.origin, {}],
    [bare.origin, {}],
    [tampered.origin, {}],
    [hangs.origin, { liveOptions: { timeoutMs: 150 } }],
  ]
  for (const [liveOrigin, options] of cases) {
    const app = await fixture(t, { liveOrigin, ...options })
    const started = Date.now()
    for (let i = 0; i < 3; i += 1) {
      const home = await raw(app, '/')
      assert.equal(home.status, 200, liveOrigin)
      assert.equal(
        home.body,
        '<!doctype html><title>Jacob Iwen</title><script src="/assets/app-12345678.js"></script>',
      )
    }
    assert.ok(
      Date.now() - started < 2000,
      'a dead upstream must not stall pages',
    )
  }
  assert.equal(
    logged.length,
    cases.length,
    'one log line per outage, not per request',
  )
})

test('a failed refresh keeps serving the last good state and recovery is logged once', async () => {
  let healthy = true
  let clock = 0
  const messages = []
  const realNow = Date.now
  Date.now = () => clock
  try {
    const state = createLiveSiteState({
      origin: 'http://upstream.test',
      ttlMs: 60_000,
      retryMs: 1000,
      log: (message) => messages.push(message),
      fetchPage: async () => {
        if (!healthy) throw new Error('offline')
        return new Response(`<head>${injectedTags}</head>`)
      },
    })
    assert.equal(await state.headTags(), injectedTags)
    healthy = false
    const settle = () => new Promise((done) => setImmediate(done))
    clock += 61_000
    assert.equal(await state.headTags(), injectedTags)
    await settle()
    clock += 2000
    assert.equal(await state.headTags(), injectedTags)
    healthy = true
    await settle()
    clock += 2000
    assert.equal(await state.headTags(), injectedTags)
    await settle()
    assert.equal(messages.length, 2)
    assert.match(messages[0], /offline/)
    assert.match(messages[1], /available again/)
  } finally {
    Date.now = realNow
  }
})

test('admin pages redirect to the live site, the admin API stays a 404, other paths are unaffected', async (t) => {
  const upstream = await stubUpstream(t, (_req, res) => productionPage(res))
  const app = await fixture(t, { liveOrigin: upstream.origin })
  for (const [path, location] of [
    ['/admin', '/admin'],
    ['/admin/', '/admin/'],
    ['/admin/settings', '/admin/settings'],
    ['/admin/writing/agent-sessions?x=1', '/admin/writing/agent-sessions?x=1'],
  ]) {
    const response = await raw(app, path, { headers: { Accept: 'text/html' } })
    assert.equal(response.status, 302, path)
    assert.equal(response.headers.location, `${upstream.origin}${location}`)
  }
  assert.equal(
    (
      await raw(app, '/admin/api/appearance', {
        headers: { Accept: 'text/html' },
      })
    ).status,
    404,
  )
  assert.equal(
    (await raw(app, '/administrator', { headers: { Accept: 'text/html' } }))
      .status,
    200,
  )
  assert.equal((await raw(app, '/', { method: 'POST' })).status, 405)
})

test('the element ids copied from production match the ones the app and Worker use', async () => {
  const result = await build({
    stdin: {
      contents: `export { themeStyleElementId } from './src/appearance/siteTheme'
export { settingsElementId } from './src/settings/siteSettings'
export { articleEditsElementId } from './src/articleEdits/articleEdit'`,
      resolveDir: fileURLToPath(new URL('../', import.meta.url)),
      loader: 'ts',
    },
    bundle: true,
    write: false,
    format: 'esm',
  })
  const source = `data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`
  const ids = await import(source)
  assert.deepEqual(
    { themeStyleElementId, settingsElementId, articleEditsElementId },
    {
      themeStyleElementId: ids.themeStyleElementId,
      settingsElementId: ids.settingsElementId,
      articleEditsElementId: ids.articleEditsElementId,
    },
  )
})
