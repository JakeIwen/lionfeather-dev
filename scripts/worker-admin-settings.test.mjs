import assert from 'node:assert/strict'
import { after, before, beforeEach, test } from 'node:test'
import { loadModule, startWorker, withAudience } from './worker-harness.mjs'

let worker
let adminApi
let defaults
let articleSlugs
before(async () => {
  worker = await startWorker({ bindings: withAudience })
  adminApi = (await loadModule('src/routes.ts')).adminApi
  defaults = (
    await loadModule('src/settings/siteSettings.ts')
  ).defaultSiteSettings()
  articleSlugs = (await loadModule('src/content/articles.ts')).articles.map(
    (article) => article.slug,
  )
})
after(() => worker.dispose())
beforeEach(() => worker.db.prepare('DELETE FROM settings').run())

const putSettings = (settings) =>
  worker.admin(adminApi.settings, { method: 'PUT', body: { settings } })
const currentSettings = async () =>
  (await worker.admin(adminApi.settings)).json()

test('with nothing saved, the defaults are returned', async () => {
  const response = await worker.admin(adminApi.settings)
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), defaults)
})

test('saved settings are returned normalized and persist', async () => {
  const reordered = structuredClone(defaults)
  reordered.homeSections.reverse()
  reordered.homeSections[0].visible = false
  reordered.selectedWork = reordered.selectedWork.slice(0, 2)
  reordered.featuredArticle = articleSlugs.at(-1)
  reordered.analytics = { enabled: false, extra: 'dropped' }
  reordered.unknownKey = true

  const response = await putSettings(reordered)
  assert.equal(response.status, 200)
  const saved = await response.json()
  // Ids the save left out come back in their default places.
  assert.deepEqual(
    saved.homeSections.map((item) => item.id),
    reordered.homeSections.map((item) => item.id),
  )
  assert.equal(saved.homeSections[0].visible, false)
  assert.deepEqual(
    saved.selectedWork.slice(0, 2).map((item) => item.id),
    reordered.selectedWork.map((item) => item.id),
  )
  assert.equal(saved.selectedWork.length, defaults.selectedWork.length)
  assert.deepEqual(saved.analytics, { enabled: false })
  assert.equal('unknownKey' in saved, false)
  assert.equal(saved.featuredArticle, articleSlugs.at(-1))
  assert.deepEqual(await currentSettings(), saved)
})

const rejected = {
  'a non-object': 'settings',
  'an unknown section id': (s) => (s.homeSections[0].id = 'nope'),
  'a repeated id': (s) => (s.selectedWork[1].id = s.selectedWork[0].id),
  'a missing visible flag': (s) => delete s.additionalWork[0].visible,
  'a visible flag that is not a boolean': (s) =>
    (s.homeSections[0].visible = 'yes'),
  'a list that is not a list': (s) => (s.homeSections = {}),
  'an unknown featured article': (s) => (s.featuredArticle = 'no-such-article'),
  'a missing analytics flag': (s) => (s.analytics = {}),
}
for (const [name, change] of Object.entries(rejected)) {
  test(`${name} is rejected and nothing is saved`, async () => {
    const before = await currentSettings()
    const attempt = structuredClone(defaults)
    const body =
      typeof change === 'function' ? (change(attempt), attempt) : change
    const response = await putSettings(body)
    assert.equal(response.status, 400)
    assert.equal(typeof (await response.json()).error, 'string')
    assert.deepEqual(await currentSettings(), before)
  })
}

test('a body without settings is rejected', async () => {
  const response = await worker.admin(adminApi.settings, {
    method: 'PUT',
    body: {},
  })
  assert.equal(response.status, 400)
})

test('a corrupt stored row falls back to the defaults', async () => {
  await worker.db
    .prepare(
      "INSERT INTO settings (key, value, updated_at) VALUES ('site', '{oops', 0)",
    )
    .run()
  assert.deepEqual(await currentSettings(), defaults)
})
