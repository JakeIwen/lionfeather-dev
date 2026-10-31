import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { Response } from 'miniflare'
import { loadModule, startWorker, withAudience } from './worker-harness.mjs'

const settingsPattern =
  /<script type="application\/json" id="site-settings">(.*?)<\/script>/s
const stylePattern = /<style id="theme-knobs">(.*?)<\/style>/s

let worker
let defaults
before(async () => {
  worker = await startWorker({ bindings: withAudience })
  defaults = (
    await loadModule('src/settings/siteSettings.ts')
  ).defaultSiteSettings()
})
after(() => worker.dispose())

const savedSettings = async (html) => JSON.parse(html.match(settingsPattern)[1])

test('pages carry the saved settings and theme inside <head>', async () => {
  const response = await worker.send('/')
  const html = await response.text()
  assert.equal(response.status, 200)
  assert.match(response.headers.get('content-type'), /^text\/html/)
  assert.deepEqual(await savedSettings(html), defaults)
  assert.equal(
    html.match(stylePattern)[1],
    ':root{--hue-neutral:65;--hue-brand:50;--hue-accent:155;--chroma:0.85}',
  )
  assert.ok(html.indexOf('id="theme-knobs"') < html.indexOf('</head>'))
  assert.ok(html.indexOf('id="site-settings"') < html.indexOf('</head>'))
  assert.match(html, /<title>Fixture home<\/title>/)
})

test('the site headers from public/_headers still apply to rewritten pages', async () => {
  const response = await worker.send('/writing')
  const csp = response.headers.get('content-security-policy')
  assert.match(csp, /script-src 'self'/)
  assert.match(csp, /connect-src 'self'/)
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff')
  assert.equal(response.headers.get('referrer-policy'), 'no-referrer')
})

test('unknown routes get the SPA page with settings; other methods are refused', async () => {
  const unknown = await worker.send('/work/does-not-exist')
  assert.equal(unknown.status, 200)
  assert.match(await unknown.text(), /id="site-settings"/)
  const post = await worker.send('/writing', { method: 'POST', body: 'x' })
  assert.equal(post.status, 405)
  const noApi = await worker.send('/api/nothing')
  assert.equal(noApi.status, 404)
})

test('files outside the Worker routes are served untouched', async () => {
  for (const path of ['/assets/app-12345678.css', '/theme.js', '/feed.xml']) {
    const response = await worker.send(path)
    const body = await response.text()
    assert.equal(response.status, 200, path)
    assert.ok(!body.includes('site-settings'), path)
    assert.ok(!body.includes('theme-knobs'), path)
    const etag = response.headers.get('etag')
    assert.ok(etag, `${path} keeps its ETag`)
    const again = await worker.send(path, {
      headers: { 'if-none-match': etag },
    })
    assert.equal(again.status, 304, `${path} still revalidates`)
  }
  const css = await worker.send('/assets/app-12345678.css')
  assert.equal(await css.text(), 'body{margin:0}')
})

test('saved settings and the active theme show on the next page load', async () => {
  const settings = structuredClone(defaults)
  settings.homeSections.find((item) => item.id === 'recommendation').visible =
    false
  settings.analytics.enabled = false
  const saved = await worker.admin('/admin/api/settings', {
    method: 'PUT',
    body: { settings },
  })
  assert.equal(saved.status, 200)
  const active = await worker.admin('/admin/api/appearance/active', {
    method: 'PUT',
    body: {
      active: {
        id: 'sage',
        knobs: { hueNeutral: 120, hueBrand: 145, hueAccent: 40, chroma: 1 },
      },
    },
  })
  assert.equal(active.status, 200)

  const html = await (await worker.send('/')).text()
  assert.deepEqual(await savedSettings(html), settings)
  assert.equal(
    html.match(stylePattern)[1],
    ':root{--hue-neutral:120;--hue-brand:145;--hue-accent:40;--chroma:1}',
  )
})

test('settings JSON cannot end its script element or break out of a string', async () => {
  const { settingsScriptTag, themeStyleTag } = await loadModule(
    'worker/pageInjection.ts',
  )
  const hostile = {
    featuredArticle: '</script><img src=x onerror=1>&\u2028\u2029',
  }
  const tag = settingsScriptTag(hostile)
  assert.equal(
    tag.match(/<\/script>/g).length,
    1,
    'only the closing tag ends it',
  )
  assert.ok(
    !/[<>&\u2028\u2029]/.test(
      tag.slice(tag.indexOf('>') + 1, -'</script>'.length),
    ),
  )
  assert.deepEqual(JSON.parse(settingsPattern.exec(tag)[1]), hostile)

  const style = themeStyleTag({
    id: 'x',
    knobs: { hueNeutral: 1, hueBrand: 2, hueAccent: 3, chroma: 0.5 },
  })
  assert.equal(
    style,
    '<style id="theme-knobs">:root{--hue-neutral:1;--hue-brand:2;--hue-accent:3;--chroma:0.5}</style>',
  )
})

test('conditional headers never reach the assets and validators never come back', async (t) => {
  const asked = []
  const html = '<html><head></head><body></body></html>'
  const stub = await startWorker({
    assets: (request) => {
      asked.push({
        ifNoneMatch: request.headers.get('if-none-match'),
        ifModifiedSince: request.headers.get('if-modified-since'),
      })
      return new Response(html, {
        headers: {
          'content-type': 'text/html; charset=utf-8',
          etag: '"v1"',
          'last-modified': 'Wed, 21 Oct 2015 07:28:00 GMT',
          'content-length': String(html.length),
          'cache-control': 'public, max-age=0, must-revalidate',
        },
      })
    },
  })
  t.after(() => stub.dispose())

  const get = await stub.send('/', {
    headers: {
      'if-none-match': '"v1"',
      'if-modified-since': 'Wed, 21 Oct 2015 07:28:00 GMT',
    },
  })
  assert.equal(get.status, 200)
  assert.deepEqual(asked.at(-1), { ifNoneMatch: null, ifModifiedSince: null })
  for (const name of ['etag', 'last-modified'])
    assert.equal(get.headers.get(name), null, name)
  assert.equal(get.headers.get('cache-control'), 'no-cache')
  assert.match(await get.text(), /id="site-settings"/)

  const head = await stub.send('/', { method: 'HEAD' })
  assert.equal(head.status, 200)
  assert.equal(head.headers.get('etag'), null)
  assert.equal(head.headers.get('content-length'), null)
  assert.equal(head.headers.get('cache-control'), 'no-cache')
  assert.equal(await head.text(), '')
})
