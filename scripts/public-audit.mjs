import { createHash } from 'node:crypto'
import { lstatSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parse } from 'jsonc-parser'

const fail = (message) => {
  throw new Error(message)
}
export const digest = (bytes) =>
  createHash('sha256').update(bytes).digest('hex')
const textFile = /\.(html|css|js|txt|svg)$/
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

export function checkDeploymentConfig(root) {
  const errors = []
  const config = parse(
    readFileSync(join(root, 'wrangler.jsonc'), 'utf8'),
    errors,
    { allowTrailingComma: true },
  )
  if (errors.length) fail('Invalid Wrangler configuration.')
  const allowed = [
    '$schema',
    'name',
    'compatibility_date',
    'workers_dev',
    'preview_urls',
    'send_metrics',
    'assets',
    'routes',
  ]
  if (Object.keys(config).some((key) => !allowed.includes(key))) {
    fail('Unreviewed Wrangler setting: deployment must remain static-only.')
  }
  if (
    config.assets?.directory !== './dist' ||
    config.assets?.not_found_handling !== 'single-page-application' ||
    Object.keys(config.assets).some(
      (key) => !['directory', 'not_found_handling'].includes(key),
    ) ||
    config.workers_dev !== false ||
    config.preview_urls !== false ||
    config.send_metrics !== false
  ) {
    fail(
      'Deployment must upload only dist/, with previews and CLI telemetry disabled.',
    )
  }
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
  for (const name of distFiles) {
    const bytes = readFileSync(join(root, 'dist', name))
    if (!Object.hasOwn(inventory.public, name) && name !== 'index.html') {
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
