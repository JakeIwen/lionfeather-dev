import assert from 'node:assert/strict'
import { after, before, beforeEach, test } from 'node:test'
import { loadModule, startWorker, withAudience } from './worker-harness.mjs'

const editsPattern =
  /<script type="application\/json" id="article-edits">(.*?)<\/script>/s
const slug = 'agent-sessions'

let worker
let adminApi
before(async () => {
  worker = await startWorker({ bindings: withAudience })
  adminApi = (await loadModule('src/routes.ts')).adminApi
})
after(() => worker.dispose())
beforeEach(() => worker.db.prepare('DELETE FROM article_edits').run())

const edit = (changes = {}) => ({
  title: 'A new title',
  dek: 'A new summary with <tags> & "quotes".',
  tags: ['One', ' Two '],
  published: '2026-10-25',
  markdown: '## Heading\n\nFirst paragraph.\n',
  ...changes,
})
const putArticle = (article, target = slug) =>
  worker.admin(adminApi.article(target), { method: 'PUT', body: { article } })
const savedEdits = async () => (await worker.admin(adminApi.articles)).json()
const pageEdits = async (path) =>
  JSON.parse((await (await worker.send(path)).text()).match(editsPattern)[1])

test('a saved edit is returned, trimmed and timestamped, and injected into pages', async () => {
  const response = await putArticle(edit())
  assert.equal(response.status, 200)
  const saved = await response.json()
  assert.deepEqual(saved.tags, ['One', 'Two'])
  assert.equal(typeof saved.updatedAt, 'number')
  assert.deepEqual(await savedEdits(), { [slug]: saved })
  assert.deepEqual(await pageEdits('/'), { [slug]: saved })
})

test("an edited article's page carries its new title and summary in the head", async () => {
  await putArticle(edit())
  const html = await (await worker.send(`/writing/${slug}`)).text()
  assert.match(html, /<title>A new title · Jacob Iwen<\/title>/)
  // The summary stays inside its attribute and decodes back to itself.
  const description = html.match(
    /<meta name="description" content="([^"]*)" \/>/,
  )
  assert.equal(
    description[1].replaceAll('&quot;', '"').replaceAll('&amp;', '&'),
    edit().dek,
  )
  assert.match(html, /property="og:title" content="A new title · Jacob Iwen"/)
  assert.match(html, /property="article:published_time" content="2026-10-25"/)
  const other = await (await worker.send('/writing')).text()
  assert.match(other, /<title>Fixture writing<\/title>/)
})

test('deleting an edit brings the code version back', async () => {
  await putArticle(edit())
  const response = await worker.admin(adminApi.article(slug), {
    method: 'DELETE',
  })
  assert.equal(response.status, 200)
  assert.deepEqual(await savedEdits(), {})
  const html = await (await worker.send(`/writing/${slug}`)).text()
  assert.match(html, /<title>Fixture article · Jacob Iwen<\/title>/)
})

const rejected = {
  'an empty title': { title: '  ' },
  'a missing summary': { dek: undefined },
  'an impossible date': { published: '2026-02-30' },
  'tags that are not a list': { tags: 'One, Two' },
  'Markdown that does not parse': { markdown: '# Wrong heading' },
  'Markdown over the limit': { markdown: 'x'.repeat(100_001) },
}
for (const [name, changes] of Object.entries(rejected)) {
  test(`${name} is rejected and nothing is saved`, async () => {
    const response = await putArticle(edit(changes))
    assert.equal(response.status, 400)
    assert.equal(typeof (await response.json()).error, 'string')
    assert.deepEqual(await savedEdits(), {})
  })
}

test('an unknown article is a 404 and a body without an article a 400', async () => {
  assert.equal((await putArticle(edit(), 'no-such-article')).status, 404)
  const empty = await worker.admin(adminApi.article(slug), {
    method: 'PUT',
    body: {},
  })
  assert.equal(empty.status, 400)
})

test('writes need the owner token', async () => {
  const response = await worker.send(adminApi.article(slug), {
    method: 'PUT',
    headers: {
      origin: 'https://lionfeather.dev',
      'content-type': 'application/json',
    },
    body: JSON.stringify({ article: edit() }),
  })
  assert.equal(response.status, 401)
  assert.deepEqual(await savedEdits(), {})
})

test('a corrupt stored row leaves the code version in place', async () => {
  await worker.db
    .prepare(
      "INSERT INTO article_edits (slug, value, updated_at) VALUES ('agent-sessions', '{oops', 0)",
    )
    .run()
  assert.deepEqual(await savedEdits(), {})
  assert.deepEqual(await pageEdits('/'), {})
})
