import { accessSync, constants } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'

// Adapted from Critter's server/provider-cli.mjs. The Claude CLI runs with a
// whitelisted environment so ANTHROPIC_API_KEY (API billing) and any other
// ambient secret can never reach it; the only credential is the subscription
// token from `claude setup-token` (CLAUDE_CODE_OAUTH_TOKEN) or the sign-in
// stored under HOME.
const require = createRequire(import.meta.url)
const ENVIRONMENT_NAMES = [
  'HOME',
  'USER',
  'LOGNAME',
  'PATH',
  'LANG',
  'LC_ALL',
  'SHELL',
  'CLAUDE_CODE_OAUTH_TOKEN',
]

export function claudeEnvironment(source = process.env) {
  const picked = ENVIRONMENT_NAMES.filter((key) => source[key]).map((key) => [
    key,
    source[key],
  ])
  return {
    ...Object.fromEntries(picked),
    CLAUDE_AGENT_SDK_CLIENT_APP: 'lionfeather-review/1.0',
  }
}

function executable(file) {
  try {
    accessSync(file, constants.X_OK)
    return file
  } catch {
    return undefined
  }
}

export function resolveClaudeExecutable(source = process.env) {
  // An explicit path never falls back, so a bad override fails loudly.
  if (source.REVIEW_CLAUDE_EXECUTABLE)
    return executable(source.REVIEW_CLAUDE_EXECUTABLE)
  const base = `@anthropic-ai/claude-agent-sdk-${process.platform}-${process.arch}`
  const musl =
    process.platform === 'linux' &&
    !process.report.getReport().header.glibcVersionRuntime
  for (const name of musl ? [`${base}-musl`, base] : [base]) {
    try {
      const file = executable(require.resolve(`${name}/claude`))
      if (file) return file
    } catch {
      /* Try the next candidate, then PATH. */
    }
  }
  return (source.PATH ?? '')
    .split(path.delimiter)
    .filter(Boolean)
    .map((directory) => executable(path.join(directory, 'claude')))
    .find(Boolean)
}

/** Options shared by model discovery and reviews: no tools, no settings, no MCP. */
export function claudeOptions(
  cwd,
  resolveExecutable = resolveClaudeExecutable,
) {
  const pathToClaudeCodeExecutable = resolveExecutable()
  if (!pathToClaudeCodeExecutable) {
    throw new Error(
      'The Claude CLI is unavailable on this host. Install the bundled SDK binary and sign in with a Claude subscription.',
    )
  }
  return {
    cwd,
    env: claudeEnvironment(),
    pathToClaudeCodeExecutable,
    settingSources: [],
    strictMcpConfig: true,
    skills: [],
    verbatimPrompts: true,
    tools: [],
    persistSession: false,
    permissionMode: 'dontAsk',
    extraArgs: { restricted: null, 'disable-slash-commands': null },
  }
}
