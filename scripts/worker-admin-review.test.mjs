import assert from 'node:assert/strict'
import { after, before, beforeEach, test } from 'node:test'
import { Response } from 'miniflare'
import { loadModule, startWorker, withAudience } from './worker-harness.mjs'

const token = {
  REVIEW_ACCESS_CLIENT_ID: 'client-id.access',
  REVIEW_ACCESS_CLIENT_SECRET: 'client-secret',
}
const catalog = {
  models: [
    { id: 'claude-fable-5-1', label: 'Fable 5.1', efforts: ['low', 'high'] },
    { id: 'claude-sonnet-5-5', label: 'Sonnet 5.5', efforts: ['low'] },
  ],
  defaultModel: 'claude-fable-5-1',
  defaultEffort: 'high',
}
const reviewLines = [
  { type: 'started', model: 'claude-fable-5-1' },
  { type: 'progress', elapsedMs: 10000 },
  {
    type: 'result',
    model: 'claude-fable-5-1',
    summary: 'Fine.',
    findings: [{ quote: 'First', problem: 'Vague.', suggestion: 'Opening' }],
  },
]

// What the fake review service received, newest last.
let received = []
async function reviewService(request) {
  received.push({
    url: request.url,
    method: request.method,
    headers: Object.fromEntries(request.headers),
    body: request.method === 'POST' ? await request.json() : undefined,
  })
  const { pathname } = new URL(request.url)
  if (pathname === '/models') return Response.json(catalog)
  if (pathname === '/review')
    return new Response(
      reviewLines.map((line) => JSON.stringify(line)).join('\n') + '\n',
      { headers: { 'content-type': 'application/x-ndjson' } },
    )
  return new Response('nope', { status: 404 })
}

let worker
let unconfigured
let adminApi
before(async () => {
  worker = await startWorker({
    bindings: { ...withAudience, ...token },
    reviewService,
  })
  unconfigured = await startWorker({ bindings: withAudience, reviewService })
  adminApi = (await loadModule('src/routes.ts')).adminApi
})
after(() => Promise.all([worker.dispose(), unconfigured.dispose()]))
beforeEach(async () => {
  received = []
  await worker.db.prepare('DELETE FROM settings').run()
  await worker.db.prepare('DELETE FROM article_edits').run()
})

const draft = {
  title: 'T',
  dek: 'D',
  tags: [],
  published: '2026-10-21',
  markdown: 'First paragraph.\n',
}

test('the model list comes from the service, sent with the service token', async () => {
  const response = await worker.admin(adminApi.reviewModels)
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), catalog)
  assert.equal(received[0].headers['cf-access-client-id'], 'client-id.access')
  assert.equal(received[0].headers['cf-access-client-secret'], 'client-secret')
})

test('review settings default to Fable at high effort and save against the catalog', async () => {
  assert.deepEqual(await (await worker.admin(adminApi.reviewSettings)).json(), {
    model: 'claude-fable-5-1',
    effort: 'high',
  })
  const put = (review) =>
    worker.admin(adminApi.reviewSettings, { method: 'PUT', body: { review } })
  const saved = await put({ model: 'claude-sonnet-5-5', effort: 'low' })
  assert.equal(saved.status, 200)
  assert.equal((await put({ model: 'nope', effort: 'low' })).status, 400)
  assert.equal(
    (await put({ model: 'claude-sonnet-5-5', effort: 'high' })).status,
    400,
  )
  assert.deepEqual(await (await worker.admin(adminApi.reviewSettings)).json(), {
    model: 'claude-sonnet-5-5',
    effort: 'low',
  })
})

test('a review streams the service lines back and sends the live version for comparison', async () => {
  const response = await worker.admin(
    adminApi.articleReview('agent-sessions'),
    {
      method: 'POST',
      body: { article: draft },
    },
  )
  assert.equal(response.status, 200)
  assert.match(response.headers.get('content-type'), /ndjson/)
  const lines = (await response.text())
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line))
  assert.deepEqual(lines, reviewLines)
  const sent = received.find((request) => request.url.endsWith('/review'))
  assert.equal(sent.body.model, 'claude-fable-5-1')
  assert.equal(sent.body.effort, 'high')
  assert.deepEqual(sent.body.article, draft)
  assert.match(sent.body.previous.markdown, /reverse-engineer my van/)
  assert.equal('updatedAt' in sent.body.previous, false)
})

test('a review of an unknown article or a malformed draft is refused', async () => {
  const post = (slug, article) =>
    worker.admin(adminApi.articleReview(slug), {
      method: 'POST',
      body: { article },
    })
  assert.equal((await post('no-such-article', draft)).status, 404)
  assert.equal((await post('agent-sessions', { title: 1 })).status, 400)
  assert.equal(received.length, 0)
})

test('without the service token the review answers 503 and calls nothing', async () => {
  const response = await unconfigured.admin(adminApi.reviewModels)
  assert.equal(response.status, 503)
  assert.match((await response.json()).error, /not set up/)
  assert.equal(received.length, 0)
})
