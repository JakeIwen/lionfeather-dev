import test from 'node:test'
import assert from 'node:assert/strict'
import { claudeEnvironment } from '../src/claude/sdk-options.mjs'
import { createFakeSdk, HAIKU, SONNET } from './fake-sdk.mjs'
import { send, startService } from './harness.mjs'

async function modelsFrom(t, sdk, options) {
  const service = await startService({ sdk, ...options })
  t.after(service.close)
  return send(service.port, '/models')
}

test('GET /models lists the SDK models with efforts and prefers Fable', async (t) => {
  const response = await modelsFrom(t, createFakeSdk())
  assert.equal(response.status, 200)
  assert.deepEqual(response.json(), {
    models: [
      {
        id: 'fable',
        label: 'Fable 5.1',
        efforts: ['low', 'medium', 'high', 'xhigh', 'max'],
      },
      { id: 'sonnet', label: 'Sonnet 5.5', efforts: ['low', 'medium', 'high'] },
      { id: 'haiku', label: 'Haiku 5.5', efforts: [] },
    ],
    defaultModel: 'fable',
    defaultEffort: 'high',
  })
})

test('GET /models offers the latest Fable alias alongside older releases', async (t) => {
  const response = await modelsFrom(t, createFakeSdk({ models: [
    { ...SONNET, value: 'fable', resolvedModel: 'claude-fable-8-2', displayName: 'Fable 8.2' },
    { ...SONNET, value: 'claude-fable-8-1', resolvedModel: 'claude-fable-8-1', displayName: 'Fable 8.1' },
  ] }))
  assert.equal(response.status, 200)
  const body = response.json()
  assert.deepEqual(body.models.map(({ id, label }) => ({ id, label })), [
    { id: 'fable', label: 'Fable 8.2' },
    { id: 'claude-fable-8-1', label: 'Fable 8.1' },
  ])
  assert.equal(body.defaultModel, 'fable')
})

test('without Fable the SDK default model is the default', async (t) => {
  const response = await modelsFrom(
    t,
    createFakeSdk({ models: [HAIKU, SONNET] }),
  )
  assert.equal(response.json().defaultModel, 'sonnet')
})

test('the catalog is cached for a few minutes, then refreshed', async (t) => {
  const sdk = createFakeSdk()
  let clock = 0
  const service = await startService({ sdk, catalogNow: () => clock })
  t.after(service.close)
  await send(service.port, '/models')
  await send(service.port, '/models')
  assert.equal(sdk.state.discoveries, 1)
  clock += 6 * 60_000
  await send(service.port, '/models')
  assert.equal(sdk.state.discoveries, 2)
  assert.equal(sdk.state.closed, 2, 'discovery sessions are closed')
})

test('API-key billing, other providers and signed-out accounts are refused with 502', async (t) => {
  const cases = [
    [
      { subscriptionType: 'max', apiKeySource: 'ANTHROPIC_API_KEY' },
      /API-key billing/,
    ],
    [{ apiProvider: 'bedrock' }, /another API provider/],
    [{}, /not signed in/],
  ]
  for (const [account, message] of cases) {
    const response = await modelsFrom(t, createFakeSdk({ account }))
    assert.equal(response.status, 502)
    assert.match(response.json().error, message)
  }
})

test('discovery that cannot start the CLI answers 502 without leaking a token', async (t) => {
  const sdk = createFakeSdk()
  sdk.query = () => {
    throw new Error('spawn failed with Bearer sk-ant-oat01-secret')
  }
  const response = await modelsFrom(t, sdk)
  assert.equal(response.status, 502)
  assert.doesNotMatch(response.text, /secret/)
})

test('the CLI only sees the whitelisted environment: no API key, but the subscription token', () => {
  const env = claudeEnvironment({
    HOME: '/var/lib/lionfeather-review',
    PATH: '/usr/bin',
    ANTHROPIC_API_KEY: 'sk-ant-api03-nope',
    ANTHROPIC_AUTH_TOKEN: 'nope',
    ACCESS_AUD: 'nope',
    CLAUDE_CODE_OAUTH_TOKEN: 'sk-ant-oat01-ok',
  })
  assert.deepEqual(Object.keys(env).sort(), [
    'CLAUDE_AGENT_SDK_CLIENT_APP',
    'CLAUDE_CODE_OAUTH_TOKEN',
    'HOME',
    'PATH',
  ])
})

test('the SDK "default" alias is hidden when a named row covers the same model, and the short Fable alias wins', async (t) => {
  const response = await modelsFrom(
    t,
    createFakeSdk({
      models: [
        {
          ...SONNET,
          value: 'default',
          displayName: 'Default',
          resolvedModel: 'claude-fable-5-1',
          isDefault: true,
        },
        {
          ...SONNET,
          value: 'claude-fable-5',
          displayName: 'Fable 5',
          resolvedModel: 'claude-fable-5',
          isDefault: false,
        },
        {
          ...SONNET,
          value: 'fable',
          displayName: 'Fable 5.1',
          resolvedModel: 'claude-fable-5-1',
          isDefault: false,
        },
        {
          ...SONNET,
          value: 'opus',
          displayName: 'Opus 5.5',
          resolvedModel: 'claude-opus-5-5',
          isDefault: false,
        },
      ],
    }),
  )
  const body = response.json()
  assert.deepEqual(
    body.models.map((model) => model.id),
    ['claude-fable-5', 'fable', 'opus'],
  )
  assert.equal(body.defaultModel, 'fable')
})
