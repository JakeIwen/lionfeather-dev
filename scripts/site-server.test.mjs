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
import { request } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import {
  APP,
  HEALTH,
  STOP,
  readRecord,
  removeOwnRecord,
  startSiteServer,
} from './site-server.mjs'
import {
  assertOwnedConfiguration,
  configuration,
  ownershipMatches,
  plist,
} from './service.mjs'

async function fixture(t) {
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
  const app = await startSiteServer({ dist, stateDir: state, port: 0 })
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
