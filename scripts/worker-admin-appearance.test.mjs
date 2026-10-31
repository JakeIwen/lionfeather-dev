import assert from 'node:assert/strict'
import { after, before, beforeEach, test } from 'node:test'
import { loadModule, startWorker, withAudience } from './worker-harness.mjs'

let worker
let adminApi
let builtins
before(async () => {
  worker = await startWorker({ bindings: withAudience })
  adminApi = (await loadModule('src/routes.ts')).adminApi
  builtins = (await loadModule('src/appearance/siteTheme.ts')).builtinThemes
})
after(() => worker.dispose())
beforeEach(() => worker.db.prepare('DELETE FROM settings').run())

const knobs = { hueNeutral: 200, hueBrand: 210, hueAccent: 20, chroma: 0.7 }
const appearance = async () => (await worker.admin(adminApi.appearance)).json()
const saveTheme = (id, theme) =>
  worker.admin(adminApi.appearanceTheme(id), { method: 'PUT', body: { theme } })
const setActive = (active) =>
  worker.admin(adminApi.appearanceActive, { method: 'PUT', body: { active } })
const deleteTheme = (id) =>
  worker.admin(adminApi.appearanceTheme(id), { method: 'DELETE' })

test('with nothing saved, the first built-in theme is active and none are saved', async () => {
  const response = await worker.admin(adminApi.appearance)
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), {
    active: { id: builtins[0].id, knobs: builtins[0].knobs },
    themes: [],
  })
})

test('a saved theme is trimmed, normalized, listed and persisted', async () => {
  const response = await saveTheme('harbor', {
    id: 'harbor',
    name: '  Harbor  ',
    knobs: { ...knobs, hueNeutral: 200.0 },
  })
  assert.equal(response.status, 200)
  const saved = await response.json()
  assert.deepEqual(saved.themes, [{ id: 'harbor', name: 'Harbor', knobs }])
  assert.deepEqual(saved.active.id, builtins[0].id)
  assert.deepEqual(await appearance(), saved)
  const stored = await worker.db
    .prepare("SELECT value FROM settings WHERE key = 'appearance'")
    .first()
  assert.deepEqual(JSON.parse(stored.value), saved)
})

test('saving an existing id replaces that theme instead of adding another', async () => {
  await saveTheme('harbor', { id: 'harbor', name: 'Harbor', knobs })
  await saveTheme('dune', { id: 'dune', name: 'Dune', knobs })
  const response = await saveTheme('harbor', {
    id: 'harbor',
    name: 'Harbor 2',
    knobs: { ...knobs, chroma: 1.2 },
  })
  const { themes } = await response.json()
  assert.deepEqual(
    themes.map((theme) => [theme.id, theme.name]),
    [
      ['harbor', 'Harbor 2'],
      ['dune', 'Dune'],
    ],
  )
  assert.equal(themes[0].knobs.chroma, 1.2)
})

const badThemes = {
  'an id that does not match the URL': [
    'harbor',
    { id: 'other', name: 'Harbor', knobs },
  ],
  'an invalid id': ['Bad Id', { id: 'Bad Id', name: 'Harbor', knobs }],
  'a missing name': ['harbor', { id: 'harbor', name: '  ', knobs }],
  'an overlong name': ['harbor', { id: 'harbor', name: 'x'.repeat(41), knobs }],
  'a knob out of range': [
    'harbor',
    { id: 'harbor', name: 'Harbor', knobs: { ...knobs, hueBrand: 400 } },
  ],
  'a knob that is not a number': [
    'harbor',
    { id: 'harbor', name: 'Harbor', knobs: { ...knobs, chroma: '1' } },
  ],
  'an unknown knob': [
    'harbor',
    { id: 'harbor', name: 'Harbor', knobs: { ...knobs, extra: 1 } },
  ],
  'missing knobs': ['harbor', { id: 'harbor', name: 'Harbor' }],
  'a built-in theme id': ['sage', { id: 'sage', name: 'Mine', knobs }],
}
for (const [name, [id, theme]] of Object.entries(badThemes)) {
  test(`saving ${name} is rejected and nothing changes`, async () => {
    const before = await appearance()
    const response = await saveTheme(id, theme)
    assert.equal(response.status, 400)
    assert.equal(typeof (await response.json()).error, 'string')
    assert.deepEqual(await appearance(), before)
  })
}

test('the active theme can be a built-in or a saved theme, with its own knobs', async () => {
  const sage = builtins.find((theme) => theme.id === 'sage')
  const builtin = await setActive({
    id: 'sage',
    knobs: { ...sage.knobs, chroma: 1.4 },
  })
  assert.equal(builtin.status, 200)
  assert.deepEqual((await builtin.json()).active, {
    id: 'sage',
    knobs: { ...sage.knobs, chroma: 1.4 },
  })

  await saveTheme('harbor', { id: 'harbor', name: 'Harbor', knobs })
  const saved = await setActive({ id: 'harbor', knobs })
  assert.equal(saved.status, 200)
  const now = await appearance()
  assert.deepEqual(now.active, { id: 'harbor', knobs })
  assert.equal(now.themes.length, 1)
})

const badActives = {
  'an unknown theme': { id: 'nope', knobs },
  'knobs out of range': { id: 'sage', knobs: { ...knobs, chroma: 5 } },
  'missing knobs': { id: 'sage' },
  'a malformed id': { id: 'Not Valid', knobs },
  'a non-object': 'sage',
}
for (const [name, active] of Object.entries(badActives)) {
  test(`activating ${name} is rejected`, async () => {
    const before = await appearance()
    const response = await setActive(active)
    assert.equal(response.status, 400)
    assert.deepEqual(await appearance(), before)
  })
}

test('saved themes can be deleted; built-in and unknown ones cannot', async () => {
  await saveTheme('harbor', { id: 'harbor', name: 'Harbor', knobs })
  await saveTheme('dune', { id: 'dune', name: 'Dune', knobs })

  const removed = await deleteTheme('harbor')
  assert.equal(removed.status, 200)
  assert.deepEqual(
    (await removed.json()).themes.map((theme) => theme.id),
    ['dune'],
  )

  const builtin = await deleteTheme('clay')
  assert.equal(builtin.status, 400)
  const unknown = await deleteTheme('harbor')
  assert.equal(unknown.status, 404)
  assert.equal(typeof (await unknown.json()).error, 'string')
  assert.deepEqual(
    (await appearance()).themes.map((theme) => theme.id),
    ['dune'],
  )
})

test('stored built-ins and unreadable entries never reach the owner', async () => {
  const stored = {
    active: { id: 'Not Valid!', knobs: {} },
    themes: [
      { id: 'sage', name: 'Hijacked built-in', knobs },
      { id: 'harbor', name: 'Harbor', knobs },
      { id: 'harbor', name: 'Repeat', knobs },
      { name: 'No id', knobs },
    ],
  }
  await worker.db
    .prepare(
      "INSERT INTO settings (key, value, updated_at) VALUES ('appearance', ?1, 0)",
    )
    .bind(JSON.stringify(stored))
    .run()
  const now = await appearance()
  assert.deepEqual(now.themes, [{ id: 'harbor', name: 'Harbor', knobs }])
  assert.equal(now.active.id, builtins[0].id)
})
