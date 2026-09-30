import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { auditArtifacts, checkDeploymentConfig } from './public-audit.mjs'

const root = fileURLToPath(new URL('../', import.meta.url))
const fail = (message) => {
  throw new Error(message)
}
const privatePaths = [
  'AGENTS.private.md',
  '.agent/handoffs/example.md',
  '.local/example',
  '.env',
]
// This check works on an uncommitted repository; it does not touch the index.
if (existsSync(join(root, '.git'))) {
  for (const path of privatePaths) {
    try {
      execFileSync('git', ['check-ignore', '--quiet', path], { cwd: root })
    } catch {
      fail(`Private path is not ignored: ${path}`)
    }
  }
  const tracked = execFileSync('git', ['ls-files', '-z'], {
    cwd: root,
    encoding: 'utf8',
  })
    .split('\0')
    .filter(Boolean)
  if (
    tracked.some((path) =>
      /(^|\/)(\.agent|\.local|\.env)(\/|$|\.)|\.private\.md$/.test(path),
    )
  ) {
    fail('A private path is present in the Git index.')
  }
}

checkDeploymentConfig(root)
const inventory = JSON.parse(
  readFileSync(join(root, 'scripts/public-assets.json'), 'utf8'),
)
const count = auditArtifacts(root, inventory)
console.log(
  `Public artifact check passed (${count} files); private paths are excluded.`,
)
