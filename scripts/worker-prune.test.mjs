import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { loadModule, startWorker } from './worker-harness.mjs'

const dayMs = 24 * 60 * 60 * 1000
const utcDay = (ms) => new Date(ms).toISOString().slice(0, 10)

let worker
let retentionDays
before(async () => {
  worker = await startWorker()
  retentionDays = (await loadModule('worker/prune.ts')).eventRetentionDays
})
after(() => worker.dispose())

const insertEvent = (ts, path) =>
  worker.db
    .prepare(
      `INSERT INTO events (ts, day, visitor, kind, path, device, browser)
       VALUES (?1, ?2, 'v', 'view', ?3, 'desktop', 'Chrome')`,
    )
    .bind(ts, utcDay(ts), path)
const remaining = async (table, column) =>
  (
    await worker.db
      .prepare(`SELECT ${column} FROM ${table} ORDER BY ${column}`)
      .all()
  ).results.map((row) => row[column])
const runCron = async (scheduledTime) => {
  const handler = await worker.miniflare.getWorker()
  const result = await handler.scheduled({
    scheduledTime: new Date(scheduledTime),
    cron: '17 4 * * *',
  })
  assert.equal(result.outcome, 'ok')
}

test('the daily cron deletes events past retention and salts of finished days', async () => {
  const now = Date.now()
  assert.equal(retentionDays, 395)
  await worker.db.batch([
    insertEvent(now - (retentionDays + 1) * dayMs, '/expired'),
    insertEvent(now - (retentionDays - 1) * dayMs, '/kept-old'),
    insertEvent(now, '/today'),
    worker.db.prepare(
      "INSERT INTO settings (key, value, updated_at) VALUES ('site', '{}', 0)",
    ),
    worker.db
      .prepare(
        "INSERT INTO salts (day, salt) VALUES (?1, 'a'), (?2, 'b'), (?3, 'c')",
      )
      .bind(utcDay(now - 3 * dayMs), utcDay(now - dayMs), utcDay(now)),
  ])

  await runCron(now)

  assert.deepEqual(await remaining('events', 'path'), ['/kept-old', '/today'])
  assert.deepEqual(await remaining('salts', 'day'), [utcDay(now)])
  assert.deepEqual(await remaining('settings', 'key'), ['site'])
})

test('a later run also retires the previous day salt and ages out more events', async () => {
  const now = Date.now()
  await worker.db.prepare('DELETE FROM events').run()
  await worker.db.batch([
    insertEvent(now - (retentionDays - 1) * dayMs, '/aging'),
    insertEvent(now, '/recent'),
  ])
  const tomorrow = now + 2 * dayMs
  await runCron(tomorrow)
  assert.deepEqual(await remaining('events', 'path'), ['/recent'])
  assert.deepEqual(await remaining('salts', 'day'), [])
})

test('the next beacon after a prune recreates the day salt', async () => {
  const response = await worker.beacon({ kind: 'view', path: '/' })
  assert.equal(response.status, 204)
  assert.deepEqual(await remaining('events', 'path'), ['/', '/recent'])
  assert.deepEqual(await remaining('salts', 'day'), [utcDay(Date.now())])
})
