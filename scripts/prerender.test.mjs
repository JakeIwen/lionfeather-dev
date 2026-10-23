import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { build } from 'vite'
import { ROOT } from './site-server.mjs'

function pageHead(html) {
  const title = html.match(/<title>(.*?)<\/title>/s)?.[1]
  const ogTitle = html.match(/property="og:title" content="([^"]*)"/)?.[1]
  const canonical = html.match(/rel="canonical" href="([^"]*)"/)?.[1]
  const description = html.match(/name="description" content="([^"]*)"/)?.[1]
  return { title, ogTitle, canonical, description }
}

test('the production build emits every route head and a parseable article feed', async (t) => {
  const outDir = mkdtempSync(join(tmpdir(), 'lionfeather-prerender-test-'))
  t.after(() => rmSync(outDir, { recursive: true, force: true }))
  await build({
    root: ROOT,
    logLevel: 'silent',
    build: { outDir, emptyOutDir: true },
  })
  const inventory = JSON.parse(
    readFileSync(join(ROOT, 'scripts/public-assets.json'), 'utf8'),
  )
  const read = (file) => readFileSync(join(outDir, file), 'utf8')
  const home = pageHead(read('index.html'))
  for (const file of inventory.generated.filter((name) =>
    name.endsWith('.html'),
  )) {
    const html = read(file)
    const head = pageHead(html)
    const pathname = file === 'index.html' ? '/' : `/${file.slice(0, -5)}`
    assert.equal(head.canonical, `https://lionfeather.dev${pathname}`, file)
    assert.ok(head.title && head.description, file)
    assert.equal(head.title, head.ogTitle, file)
    if (file !== 'index.html') assert.notEqual(head.title, home.title, file)
    assert.match(
      html,
      /<script type="module"[^>]*src="\/assets\/[^\"]+\.js"/,
      file,
    )
    assert.match(html, /rel="alternate" type="application\/rss\+xml"/, file)
    assert.match(
      html,
      new RegExp(
        `property="og:type" content="${file.startsWith('writing/') ? 'article' : 'website'}"`,
      ),
      file,
    )
    assert.equal((html.match(/<title>/g) ?? []).length, 1, file)
  }
  const article = pageHead(read('writing/agent-sessions.html'))
  assert.match(
    read('writing/agent-sessions.html'),
    /property="og:image" content="https:\/\/lionfeather.dev\/images\//,
  )
  assert.notEqual(
    pageHead(read('writing/token-surplus.html')).title,
    article.title,
  )
  const feed = JSON.parse(
    execFileSync(
      'python3',
      [
        '-I',
        '-c',
        `
import json, sys, xml.etree.ElementTree as ET
root = ET.fromstring(sys.stdin.read())
assert root.tag == 'rss' and root.attrib['version'] == '2.0'
channel = root.find('channel')
assert channel.findtext('title') and channel.findtext('link') and channel.findtext('description')
print(json.dumps([dict(title=item.findtext('title'), link=item.findtext('link'), guid=item.findtext('guid'), description=item.findtext('description'), published=item.findtext('pubDate')) for item in channel.findall('item')]))
`,
      ],
      { input: read('feed.xml'), encoding: 'utf8' },
    ),
  )
  const articleFiles = inventory.generated.filter((name) =>
    name.startsWith('writing/') && name.endsWith('.html'),
  )
  assert.equal(feed.length, articleFiles.length)
  const entry = feed.find((item) => item.link === article.canonical)
  assert.ok(entry)
  assert.equal(entry.guid, entry.link)
  assert.ok(article.title.startsWith(entry.title))
  assert.equal(article.description, entry.description)
  for (const item of feed) assert.ok(Number.isFinite(Date.parse(item.published)))
})
