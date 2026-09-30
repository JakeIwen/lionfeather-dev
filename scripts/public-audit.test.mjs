import assert from 'node:assert/strict'
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  rmSync,
  symlinkSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import {
  auditArtifacts,
  checkDeploymentConfig,
  digest,
  scanText,
} from './public-audit.mjs'

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'lionfeather-public-audit-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  for (const dir of ['public', 'dist/assets'])
    mkdirSync(join(root, dir), { recursive: true })
  const pdf = Buffer.from('%PDF-1.7\nReviewed public resume')
  for (const dir of ['public', 'dist'])
    writeFileSync(join(root, dir, 'Jacob-Iwen-Resume.pdf'), pdf)
  writeFileSync(join(root, 'dist/index.html'), '<title>Portfolio</title>')
  writeFileSync(
    join(root, 'dist/assets/index-12345678.js'),
    'console.log("Hello")',
  )
  const inventory = {
    public: { 'Jacob-Iwen-Resume.pdf': digest(pdf) },
    fonts: {},
  }
  return { root, inventory }
}

test('accepts reviewed assets and generated bundles', (t) => {
  const { root, inventory } = fixture(t)
  assert.equal(auditArtifacts(root, inventory), 4)
})

for (const name of [
  'notes.txt',
  'backup.zip',
  '.env.production',
  'assets/index-12345678.js.map',
  'AGENTS.private.md',
]) {
  test(`rejects unexpected build file ${name}`, (t) => {
    const { root, inventory } = fixture(t)
    writeFileSync(join(root, 'dist', name), 'private content')
    assert.throws(() => auditArtifacts(root, inventory), /Blocked|Unexpected/)
  })
}

test('blocks changed binary assets even when copied into the build', (t) => {
  const { root, inventory } = fixture(t)
  for (const dir of ['public', 'dist'])
    writeFileSync(
      join(root, dir, 'Jacob-Iwen-Resume.pdf'),
      '%PDF-1.7\nUnreviewed contact details',
    )
  assert.throws(
    () => auditArtifacts(root, inventory),
    /privacy review required/,
  )
})

test('blocks unreviewed public images and symlinks', (t) => {
  const { root, inventory } = fixture(t)
  writeFileSync(join(root, 'public/new.png'), 'unreviewed screenshot')
  assert.throws(
    () => auditArtifacts(root, inventory),
    /Unreviewed public asset/,
  )
  rmSync(join(root, 'public/new.png'))
  symlinkSync(join(root, 'public'), join(root, 'dist/private-link'))
  assert.throws(() => auditArtifacts(root, inventory), /symlink/)
})

test('rejects stale built copies and symlinked public roots', (t) => {
  const { root, inventory } = fixture(t)
  writeFileSync(join(root, 'dist/Jacob-Iwen-Resume.pdf'), '%PDF-stale')
  assert.throws(() => auditArtifacts(root, inventory), /does not match/)
  rmSync(join(root, 'dist'), { recursive: true })
  symlinkSync(join(root, 'public'), join(root, 'dist'))
  assert.throws(() => auditArtifacts(root, inventory), /real directories/)
})

test('detects credentials and private addresses without echoing them', () => {
  for (const value of [
    'sk-proj-' + 'a'.repeat(45),
    '192.168.1.2',
    'example-device.lan',
    'example-device.local',
    'context.private.md',
    '/home/example/private-file',
    '-----BEGIN PRIVATE KEY-----',
    'password="' + 's'.repeat(16) + '"',
  ]) {
    assert.throws(
      () => scanText(value, 'bundle.js'),
      (error) => {
        assert.match(error.message, /Blocked/)
        assert.ok(!error.message.includes(value))
        return true
      },
    )
  }
})

test('deployment cannot silently expand to repository files or a backend', (t) => {
  const { root } = fixture(t)
  const config = {
    assets: {
      directory: './dist',
      not_found_handling: 'single-page-application',
    },
    workers_dev: false,
    preview_urls: false,
    send_metrics: false,
  }
  const save = (value) =>
    writeFileSync(join(root, 'wrangler.jsonc'), JSON.stringify(value))
  save(config)
  checkDeploymentConfig(root)
  writeFileSync(
    join(root, 'wrangler.jsonc'),
    JSON.stringify(config).replace(/}$/, ',}'),
  )
  checkDeploymentConfig(root)
  save({ ...config, assets: { ...config.assets, directory: '.' } })
  assert.throws(() => checkDeploymentConfig(root), /only dist/)
  save({ ...config, main: 'private-server.js' })
  assert.throws(() => checkDeploymentConfig(root), /static-only/)
  save({ ...config, vars: { PRIVATE_VALUE: 'example' } })
  assert.throws(() => checkDeploymentConfig(root), /static-only/)
})
