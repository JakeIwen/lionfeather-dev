import { createHash } from 'node:crypto'
import { lstatSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parse } from 'jsonc-parser'

const fail = (message) => {
  throw new Error(message)
}
export const digest = (bytes) =>
  createHash('sha256').update(bytes).digest('hex')
const textFile = /\.(html|css|js|txt|svg|xml)$/
const privatePath =
  /(^|\/)(\.[^/]+|AGENTS[^/]*|[^/]*\.private\.[^/]*)(\/|$)|\.(map|pem|key|p12|sqlite|db|zip|bak|log)$/i
const forbidden = [
  [
    'private source reference',
    /\b[\w.-]+\.private\.md\b|\/(?:Users|home)\/[^/]+\//i,
  ],
  [
    'local device address',
    /\b(?:[\w-]+\.(?:lan|local)|192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})\b/i,
  ],
  ['private key', /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  [
    'API credential',
    /\b(?:sk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{20,}|gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}|AIza[\w-]{30,}|(?:AKIA|ASIA)[A-Z0-9]{16})\b/,
  ],
  [
    'credential assignment',
    /["']?(?:api[_-]?key|access[_-]?token|client[_-]?secret|password)["']?\s*[:=]\s*["'][^"'\s]{12,}["']/i,
  ],
]

export function scanText(text, label) {
  for (const [reason, pattern] of forbidden) {
    // Never include the matching value in errors or CI logs.
    if (pattern.test(text)) fail(`Blocked ${reason} in ${label}.`)
  }
}

function files(directory, prefix = '') {
  const stat = lstatSync(directory)
  if (stat.isSymbolicLink() || !stat.isDirectory())
    fail('Public roots must be real directories.')
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const name = prefix + entry.name
    if (privatePath.test(name)) fail(`Blocked private file: ${name}`)
    if (entry.isSymbolicLink()) fail(`Blocked symlink: ${name}`)
    if (entry.isDirectory())
      return files(join(directory, entry.name), name + '/')
    if (!entry.isFile()) fail(`Blocked non-regular file: ${name}`)
    return [name]
  })
}

// The reviewed Worker: one entry point in front of dist/, one D1 database, a
// daily cron and three plain-text vars. Anything else is a change to review.
const reviewedKeys = [
  '$schema',
  'name',
  'main',
  'compatibility_date',
  'workers_dev',
  'preview_urls',
  'send_metrics',
  'assets',
  'routes',
  'd1_databases',
  'triggers',
  'vars',
]
const reviewedAssetKeys = [
  'directory',
  'binding',
  'not_found_handling',
  'html_handling',
  'run_worker_first',
]
const reviewedD1Keys = [
  'binding',
  'database_name',
  'database_id',
  'migrations_dir',
]
const reviewedVars = ['ACCESS_TEAM_DOMAIN', 'ACCESS_AUD', 'OWNER_EMAIL']
const onlyKeys = (value, allowed) =>
  Object.keys(value).every((key) => allowed.includes(key))
const sameKeys = (value, expected) =>
  onlyKeys(value, expected) && expected.every((key) => key in value)
const isObject = (value) =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

function checkAssetsConfig(assets) {
  if (
    !isObject(assets) ||
    !onlyKeys(assets, reviewedAssetKeys) ||
    assets.directory !== './dist' ||
    assets.binding !== 'ASSETS' ||
    assets.not_found_handling !== 'single-page-application' ||
    (assets.html_handling !== undefined &&
      assets.html_handling !== 'auto-trailing-slash')
  ) {
    fail(
      'Deployment must upload only dist/, with previews and CLI telemetry disabled.',
    )
  }
  const workerFirst = assets.run_worker_first
  if (
    workerFirst !== undefined &&
    !(
      Array.isArray(workerFirst) &&
      workerFirst.every(
        (rule) => typeof rule === 'string' && /^!?\/[\w./*-]*$/.test(rule),
      )
    )
  ) {
    fail('Unreviewed Wrangler setting: run_worker_first must be path rules.')
  }
}

function checkWorkerBindings(config) {
  const [database, ...others] = config.d1_databases ?? []
  if (
    others.length ||
    !isObject(database) ||
    !onlyKeys(database, reviewedD1Keys) ||
    database.binding !== 'DB' ||
    database.database_name !== 'lionfeather-site' ||
    !/^[0-9a-f-]{36}$/.test(database.database_id ?? '') ||
    (database.migrations_dir !== undefined &&
      database.migrations_dir !== 'migrations')
  ) {
    fail('Unreviewed Wrangler setting: only the DB database may be bound.')
  }
  if (
    !isObject(config.vars) ||
    !sameKeys(config.vars, reviewedVars) ||
    Object.values(config.vars).some((value) => typeof value !== 'string')
  ) {
    fail(`Unreviewed Wrangler setting: vars must be exactly ${reviewedVars}.`)
  }
  const crons = config.triggers?.crons
  if (
    !isObject(config.triggers) ||
    !sameKeys(config.triggers, ['crons']) ||
    !Array.isArray(crons) ||
    crons.length !== 1 ||
    typeof crons[0] !== 'string'
  ) {
    fail('Unreviewed Wrangler setting: exactly one cron trigger is allowed.')
  }
}

export function checkDeploymentConfig(root) {
  const errors = []
  const config = parse(
    readFileSync(join(root, 'wrangler.jsonc'), 'utf8'),
    errors,
    { allowTrailingComma: true },
  )
  if (errors.length) fail('Invalid Wrangler configuration.')
  if (!onlyKeys(config, reviewedKeys) || config.main !== './worker/index.ts') {
    fail(
      'Unreviewed Wrangler setting: deployment is limited to the reviewed Worker.',
    )
  }
  checkAssetsConfig(config.assets)
  if (
    config.workers_dev !== false ||
    config.preview_urls !== false ||
    config.send_metrics !== false
  ) {
    fail(
      'Deployment must upload only dist/, with previews and CLI telemetry disabled.',
    )
  }
  checkWorkerBindings(config)
}

export function auditArtifacts(root, inventory) {
  const publicFiles = files(join(root, 'public'))
  const distFiles = files(join(root, 'dist'))
  for (const name of publicFiles) {
    if (!Object.hasOwn(inventory.public, name))
      fail(`Unreviewed public asset: ${name}`)
    const bytes = readFileSync(join(root, 'public', name))
    const expected = inventory.public[name]
    if (expected === null) {
      if (!textFile.test(name) && name !== '_headers')
        fail(`Binary asset requires review: ${name}`)
    } else if (digest(bytes) !== expected) {
      fail(`Public asset changed; privacy review required: ${name}`)
    }
    if (
      !distFiles.includes(name) ||
      !bytes.equals(readFileSync(join(root, 'dist', name)))
    ) {
      fail(`Build does not match public asset: ${name}`)
    }
  }
  for (const name of Object.keys(inventory.public)) {
    if (!publicFiles.includes(name))
      fail(`Reviewed public asset is missing: ${name}`)
  }
  for (const name of inventory.generated) {
    if (!/\.(html|xml)$/.test(name))
      fail(`Generated artifact must be text: ${name}`)
    if (!distFiles.includes(name))
      fail(`Generated artifact is missing: ${name}`)
  }
  for (const name of distFiles) {
    const bytes = readFileSync(join(root, 'dist', name))
    if (
      !Object.hasOwn(inventory.public, name) &&
      !inventory.generated.includes(name)
    ) {
      if (Object.hasOwn(inventory.fonts, name)) {
        if (digest(bytes) !== inventory.fonts[name])
          fail(`Font changed; review required: ${name}`)
      } else if (
        !/^assets\/[A-Za-z0-9_-]+-[A-Za-z0-9_-]{8,}\.(js|css)$/.test(name)
      ) {
        fail(`Unexpected build artifact: ${name}`)
      }
    }
    if (textFile.test(name) || name === '_headers')
      scanText(bytes.toString('utf8'), name)
  }
  const pdf = readFileSync(join(root, 'public/Jacob-Iwen-Resume.pdf'))
  if (pdf.subarray(0, 5).toString() !== '%PDF-')
    fail('Resume asset is not a PDF.')
  return publicFiles.length + distFiles.length
}
