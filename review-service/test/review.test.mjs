import test from 'node:test'
import assert from 'node:assert/strict'
import { assistant, createFakeSdk, resultOf } from './fake-sdk.mjs'
import {
  article,
  reviewBody,
  send,
  startReview,
  startService,
} from './harness.mjs'

async function serve(t, sdk, route) {
  const service = await startService({ sdk, route })
  t.after(service.close)
  return service.port
}

const replyWith = (reply) => () => [assistant('{}'), resultOf(reply)]
const finding = (overrides = {}) => ({
  quote: 'tested in production',
  problem: 'The article does not say a benchmark and production differ.',
  suggestion: 'benchmarked on one van',
  ...overrides,
})

test('a review streams started, then one result with the model that answered', async (t) => {
  const sdk = createFakeSdk({
    review: replyWith({ summary: 'Mostly sound.', findings: [finding()] }),
  })
  const port = await serve(t, sdk)
  const review = await startReview(port, reviewBody())
  assert.equal(review.status, 200)
  assert.match(review.headers['content-type'], /^application\/x-ndjson/)
  assert.deepEqual(await review.all(), [
    { type: 'started', model: 'fable' },
    {
      type: 'result',
      model: 'claude-fable-5-1',
      summary: 'Mostly sound.',
      findings: [finding()],
    },
  ])
  const [call] = sdk.state.reviews
  assert.equal(call.options.model, 'fable')
  assert.equal(call.options.effort, 'high')
  assert.deepEqual(call.options.tools, [])
  assert.equal(call.options.maxTurns, 3)
  assert.equal(call.options.outputFormat.type, 'json_schema')
  assert.match(call.prompt, /tested in production on one van/)
  assert.match(call.options.systemPrompt, /em dashes/)
})

test('a slow model gets progress lines while the stream stays open', async (t) => {
  const sdk = createFakeSdk({
    async *review() {
      await new Promise((resolve) => setTimeout(resolve, 120))
      yield resultOf({ summary: 'Slow but fine.', findings: [] })
    },
  })
  const port = await serve(t, sdk, { progressMs: 20 })
  const lines = await (await startReview(port, reviewBody())).all()
  const progress = lines.filter((line) => line.type === 'progress')
  assert.ok(
    progress.length >= 3,
    `expected several progress lines, got ${progress.length}`,
  )
  assert.ok(
    progress.every(
      (line, index) =>
        line.elapsedMs > 0 &&
        (!index || line.elapsedMs >= progress[index - 1].elapsedMs),
    ),
  )
  assert.deepEqual(
    lines.map((line) => line.type).filter((type) => type !== 'progress'),
    ['started', 'result'],
  )
  assert.equal(lines.at(-1).type, 'result')
})

test('findings are kept only when their quote is really in the article', async (t) => {
  const reply = {
    summary: 'Check these.',
    findings: [
      finding(),
      finding({
        quote: 'The decoder   reads\nevery frame.',
        problem: 'Wrapped quote.',
        suggestion: 'The decoder reads each frame.',
      }),
      finding({
        quote: 'text that is not in the article',
        problem: 'Invented quote.',
      }),
      finding({
        quote: '',
        problem: 'Title: vague.',
        suggestion: 'Use a more specific title.',
      }),
      finding({
        quote: 'It was tested in production',
        suggestion: 'It was tested in production',
      }),
      finding({ problem: '   ' }),
      { quote: 5 },
    ],
  }
  const port = await serve(t, createFakeSdk({ review: replyWith(reply) }))
  const result = (await (await startReview(port, reviewBody())).all()).at(-1)
  assert.deepEqual(
    result.findings.map((item) => [item.quote, item.problem]),
    [
      ['tested in production', finding().problem],
      ['The decoder reads every frame.', 'Wrapped quote.'],
      ['', 'Title: vague.'],
    ],
  )
  for (const item of result.findings)
    assert.ok(item.quote === '' || article.markdown.includes(item.quote))
})

test('no more than 15 findings come back', async (t) => {
  const many = Array.from({ length: 30 }, (_, index) =>
    finding({ problem: `Problem ${index}.` }),
  )
  const port = await serve(
    t,
    createFakeSdk({ review: replyWith({ summary: 'Lots.', findings: many }) }),
  )
  const result = (await (await startReview(port, reviewBody())).all()).at(-1)
  assert.equal(result.findings.length, 15)
  assert.equal(result.findings[0].problem, 'Problem 0.')
})

test('a previous version focuses the review on what changed', async (t) => {
  const sdk = createFakeSdk()
  const port = await serve(t, sdk)
  const previous = {
    ...article,
    markdown: 'The decoder reads every frame.\n\nOld closing paragraph.',
  }
  await (await startReview(port, reviewBody({ previous }))).all()
  const { prompt } = sdk.state.reviews[0]
  assert.match(prompt, /Focus this review on what changed/)
  assert.match(
    prompt,
    /Blocks that are new or edited:\n---\nIt was tested in production on one van\.\n---/,
  )
  assert.match(prompt, /<previous_article>[\s\S]*Old closing paragraph/)
})

test('a reply that is not usable gets one repair retry, then an error line', async (t) => {
  let calls = 0
  const sdk = createFakeSdk({
    review: () =>
      ++calls === 1
        ? [assistant('Sorry, here you go: nothing'), resultOf(undefined)]
        : [resultOf({ summary: 'Repaired.', findings: [] })],
  })
  const port = await serve(t, sdk)
  const lines = await (await startReview(port, reviewBody())).all()
  assert.equal(lines.at(-1).summary, 'Repaired.')
  assert.equal(sdk.state.reviews.length, 2)
  assert.match(sdk.state.reviews[1].prompt, /previous reply could not be used/)

  const hopeless = createFakeSdk({
    review: () => [assistant('no json'), resultOf(undefined)],
  })
  const second = await serve(t, hopeless)
  const failed = (await (await startReview(second, reviewBody())).all()).at(-1)
  assert.equal(failed.type, 'error')
  assert.equal(hopeless.state.reviews.length, 2)
})

test('JSON in a code fence in the text reply is accepted when there is no structured output', async (t) => {
  const text = 'Here:\n```json\n{"summary":"Fenced.","findings":[]}\n```'
  const port = await serve(
    t,
    createFakeSdk({
      review: () => [
        assistant(text),
        { type: 'result', subtype: 'success', result: text },
      ],
    }),
  )
  assert.equal(
    (await (await startReview(port, reviewBody())).all()).at(-1).summary,
    'Fenced.',
  )
})

test('a refusal becomes an error line, whether or not a fallback model was tried', async (t) => {
  const declined = createFakeSdk({
    review: () => [
      assistant('I cannot review this article.'),
      {
        type: 'system',
        subtype: 'model_refusal_no_fallback',
        original_model: 'claude-fable-5-1',
      },
      {
        type: 'result',
        subtype: 'success',
        stop_reason: 'refusal',
        result: '',
      },
    ],
  })
  const port = await serve(t, declined)
  const lines = await (await startReview(port, reviewBody())).all()
  assert.equal(lines.at(-1).type, 'error')
  assert.match(lines.at(-1).message, /declined to review/)

  const recovered = createFakeSdk({
    review: () => [
      {
        type: 'system',
        subtype: 'model_refusal_fallback',
        fallback_model: 'claude-opus-5-5',
        original_model: 'claude-fable-5-1',
      },
      resultOf({ summary: 'Answered by the fallback.', findings: [] }),
    ],
  })
  const second = await serve(t, recovered)
  const answer = (await (await startReview(second, reviewBody())).all()).at(-1)
  assert.deepEqual([answer.type, answer.model], ['result', 'claude-opus-5-5'])
})

test('SDK failures reach the caller as an error line without credentials', async (t) => {
  const sdk = createFakeSdk({
    review: () => [
      {
        type: 'result',
        subtype: 'error_during_execution',
        is_error: true,
        errors: ['boom sk-ant-oat01-hunter2 Bearer abc.def'],
      },
    ],
  })
  const port = await serve(t, sdk)
  const last = (await (await startReview(port, reviewBody())).all()).at(-1)
  assert.equal(last.type, 'error')
  assert.match(last.message, /boom/)
  assert.doesNotMatch(last.message, /hunter2|abc\.def/)
})

test('a review that runs past the timeout is stopped with an error line', async (t) => {
  const sdk = createFakeSdk({
    async *review(_call, _state, closed) {
      await closed
    },
  })
  const port = await serve(t, sdk, { timeoutMs: 60 })
  const last = (await (await startReview(port, reviewBody())).all()).at(-1)
  assert.equal(last.type, 'error')
  assert.match(last.message, /took longer than/)
  assert.equal(sdk.state.aborted, 1)
  assert.ok(sdk.state.closed >= 1)
})

test('hanging up cancels the model call', async (t) => {
  let entered
  const reached = new Promise((resolve) => {
    entered = resolve
  })
  const sdk = createFakeSdk({
    async *review(_call, _state, closed) {
      entered()
      await closed
    },
  })
  const port = await serve(t, sdk)
  const review = await startReview(port, reviewBody())
  assert.equal((await review.next()).type, 'started')
  await reached
  review.abort()
  const deadline = Date.now() + 2000
  while (sdk.state.aborted === 0 && Date.now() < deadline)
    await new Promise((resolve) => setTimeout(resolve, 10))
  assert.equal(sdk.state.aborted, 1)
  assert.equal(sdk.state.interrupted, 1)
  // The slot is free again for the next review.
  const next = await startReview(port, reviewBody())
  assert.equal(next.status, 200)
  next.abort()
})

test('only one review runs at a time', async (t) => {
  let release
  const gate = new Promise((resolve) => {
    release = resolve
  })
  const sdk = createFakeSdk({
    async *review() {
      await gate
      yield resultOf({ summary: 'Done.', findings: [] })
    },
  })
  const port = await serve(t, sdk)
  const first = await startReview(port, reviewBody())
  await first.next()
  const second = await send(port, '/review', {
    method: 'POST',
    body: reviewBody(),
  })
  assert.equal(second.status, 429)
  assert.match(second.json().error, /already running/)
  release()
  assert.equal((await first.all()).at(-1).type, 'result')
  assert.equal((await startReview(port, reviewBody())).status, 200)
})

test('requests are validated against the catalog and the body shape', async (t) => {
  const port = await serve(t, createFakeSdk())
  const post = (body) => send(port, '/review', { method: 'POST', body })
  const cases = {
    'unknown model': reviewBody({ model: 'gpt-9' }),
    'effort the model lacks': reviewBody({ model: 'sonnet', effort: 'max' }),
    'unknown effort for a model without efforts': reviewBody({
      model: 'haiku',
      effort: 'turbo',
    }),
    'missing article': { model: 'fable', effort: 'high' },
    'bad date': reviewBody({ article: { ...article, published: 'yesterday' } }),
    'tags not strings': reviewBody({ article: { ...article, tags: [1] } }),
    'empty markdown': reviewBody({ article: { ...article, markdown: '  ' } }),
    'bad previous': reviewBody({ previous: { title: 'x' } }),
    'not an object': [],
  }
  for (const [name, body] of Object.entries(cases)) {
    const response = await post(body)
    assert.equal(response.status, 400, name)
    assert.equal(typeof response.json().error, 'string', name)
  }
  assert.equal(
    (await send(port, '/review', { method: 'POST', body: '{not json' })).status,
    400,
  )
  // A model with no effort levels takes any real effort name and ignores it.
  const haiku = createFakeSdk()
  const second = await serve(t, haiku)
  await (
    await startReview(second, reviewBody({ model: 'haiku', effort: 'high' }))
  ).all()
  assert.equal('effort' in haiku.state.reviews[0].options, false)
})

test('bodies over 512 KB are refused', async (t) => {
  const port = await serve(t, createFakeSdk())
  const big = reviewBody({
    article: { ...article, markdown: 'x'.repeat(600_000) },
  })
  const response = await send(port, '/review', { method: 'POST', body: big })
  assert.equal(response.status, 413)
})

test('an unavailable Claude account answers 502 before streaming', async (t) => {
  const port = await serve(t, createFakeSdk({ account: {} }))
  const response = await send(port, '/review', {
    method: 'POST',
    body: reviewBody(),
  })
  assert.equal(response.status, 502)
  assert.match(response.json().error, /not signed in/)
})
