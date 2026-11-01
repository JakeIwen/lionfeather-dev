// A stand-in for the Agent SDK's query(): discovery sessions answer from
// fixtures, review sessions replay scripted messages.
export const FABLE = {
  value: 'fable',
  resolvedModel: 'claude-fable-5-1',
  displayName: 'Fable 5.1',
  supportsEffort: true,
  supportedEffortLevels: ['low', 'medium', 'high', 'xhigh', 'max'],
  isDefault: false,
}
export const SONNET = {
  value: 'sonnet',
  resolvedModel: 'claude-sonnet-5-5',
  displayName: 'Sonnet 5.5 (recommended)',
  supportsEffort: true,
  supportedEffortLevels: ['low', 'medium', 'high'],
  isDefault: true,
}
export const HAIKU = {
  value: 'haiku',
  resolvedModel: 'claude-haiku-5-5',
  displayName: 'Haiku 5.5',
  supportsEffort: false,
  isDefault: false,
}
export const SUBSCRIBED = {
  subscriptionType: 'max',
  apiProvider: 'firstParty',
  apiKeySource: 'none',
}

export const assistant = (text, model = 'claude-fable-5-1') => ({
  type: 'assistant',
  message: {
    id: 'm1',
    model,
    content: [{ type: 'text', text }],
    stop_reason: null,
  },
})
export const resultOf = (structured) => ({
  type: 'result',
  subtype: 'success',
  structured_output: structured,
  result: '',
})

/**
 * @param {{models?: object[], account?: object,
 *   review?: (call: object, state: object, closed: Promise<void>) => AsyncIterable<object>}} options
 * `review` receives each review call; the default replies with an empty review.
 */
export function createFakeSdk({
  models = [FABLE, SONNET, HAIKU],
  account = SUBSCRIBED,
  review,
} = {}) {
  const state = {
    discoveries: 0,
    reviews: [],
    closed: 0,
    interrupted: 0,
    aborted: 0,
  }
  const query = (call) => {
    const isReview = typeof call.prompt === 'string'
    if (isReview) {
      state.reviews.push(call)
      call.options.abortController.signal.addEventListener(
        'abort',
        () => state.aborted++,
      )
    } else state.discoveries++
    let ended
    const closedPromise = new Promise((resolve) => {
      ended = resolve
    })
    return {
      initializationResult: async () => ({}),
      accountInfo: async () => account,
      supportedModels: async () => models,
      close: () => {
        state.closed++
        ended()
      },
      interrupt: async () => {
        state.interrupted++
      },
      async *[Symbol.asyncIterator]() {
        if (!isReview) return
        const messages = review
          ? review(call, state, closedPromise)
          : [assistant('{}'), resultOf({ summary: 'Fine.', findings: [] })]
        yield* messages
      },
    }
  }
  return { query, state }
}
