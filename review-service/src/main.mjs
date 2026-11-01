import { query } from '@anthropic-ai/claude-agent-sdk'
import { createModelCatalog } from './claude/model-catalog.mjs'
import { createReviewer } from './claude/reviewer.mjs'
import { resolveClaudeExecutable } from './claude/sdk-options.mjs'
import { createAccessVerifier } from './access/access-verifier.mjs'
import { loadConfig } from './config.mjs'
import { createReviewServer, listen } from './http/server.mjs'
import os from 'node:os'

// Entry point: builds the collaborators and starts listening. The SDK is
// imported here only, so everything else (and the tests) runs without it.
const config = loadConfig()
const cwd = config.workDirectory ?? os.tmpdir()
const sdk = { query, cwd, resolveExecutable: resolveClaudeExecutable }
const log = (message) => console.log(message)

const server = createReviewServer({
  config,
  verifyAccess: createAccessVerifier(config),
  catalog: createModelCatalog(sdk),
  review: createReviewer(sdk),
  log,
})
const port = await listen(server, config.port)
log(`review service listening on 127.0.0.1:${port} for ${config.publicHost}`)

for (const signal of ['SIGTERM', 'SIGINT']) {
  process.once(signal, () => {
    server.close(() => process.exit(0))
    server.closeAllConnections()
  })
}
