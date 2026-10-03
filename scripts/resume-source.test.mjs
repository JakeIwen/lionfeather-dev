import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { checkResume, configPath, publicResume } from './resume-source.mjs'

const sha256 = (text) => createHash('sha256').update(text).digest('hex')
const master = '# Resume\n\n> synchronized to masters/v12 on 2026-09-22.\n'
const publicPdf = '%PDF-1.7\nPublic resume v12'

function version(checkout, name, pdf = publicPdf, snapshot = master) {
  const directory = join(checkout, 'masters', name)
  mkdirSync(directory, { recursive: true })
  const file = `Resume_${name}_public.pdf`
  writeFileSync(join(directory, file), pdf)
  writeFileSync(join(directory, `Resume_${name}.pdf`), pdf + '\n555-0100')
  writeFileSync(join(directory, 'resume.md'), snapshot)
  writeFileSync(
    join(directory, 'verification.json'),
    JSON.stringify({
      artifactSHA256: { [`masters/${name}/${file}`]: sha256(pdf) },
    }),
  )
  return directory
}

function fixture(t, published = publicPdf) {
  const root = mkdtempSync(join(tmpdir(), 'lionfeather-resume-check-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  const checkout = join(root, 'resume-repo')
  mkdirSync(join(checkout, 'content'), { recursive: true })
  writeFileSync(join(checkout, 'content/master.md'), master)
  version(checkout, 'v11', '%PDF-1.7\nPublic resume v11', '# older\n')
  version(checkout, 'v12')
  mkdirSync(join(root, '.local'))
  writeFileSync(
    join(root, configPath),
    JSON.stringify({
      checkout: 'resume-repo',
      contentMaster: 'content/master.md',
      versions: 'masters',
    }),
  )
  mkdirSync(join(root, 'public'))
  writeFileSync(join(root, publicResume), published)
  return { root, checkout }
}

test('passes when the public resume matches the current public master', (t) => {
  const { root } = fixture(t)
  const result = checkResume(root)
  assert.equal(result.version, 'v12')
  assert.equal(result.hash, sha256(publicPdf))
})

test('fails with copy instructions when the public resume is stale', (t) => {
  const { root } = fixture(t, '%PDF-1.7\nPublic resume v11')
  assert.throws(checkResume.bind(null, root), (error) => {
    assert.match(error.message, /out of date/)
    assert.match(error.message, /v12/)
    assert.ok(error.message.includes(sha256(publicPdf)))
    assert.ok(error.message.includes('Resume_v12_public.pdf'))
    return true
  })
})

test('rejects the private variant even when it is the current version', (t) => {
  const { root } = fixture(t, publicPdf + '\n555-0100')
  assert.throws(() => checkResume(root), /out of date/)
})

test('fails when a newer version exists but the master still names the old one', (t) => {
  const { root, checkout } = fixture(t)
  version(checkout, 'v13', '%PDF-1.7\nPublic resume v13', '# draft\n')
  assert.throws(
    () => checkResume(root),
    /Newer public resume versions exist \(v13\)/,
  )
})

test('fails when the version snapshot disagrees with the content master', (t) => {
  const { root, checkout } = fixture(t)
  writeFileSync(join(checkout, 'masters/v12/resume.md'), '# edited later\n')
  assert.throws(() => checkResume(root), /snapshot differs/)
})

test('fails when the master PDF is not the verified artifact', (t) => {
  const { root, checkout } = fixture(t)
  writeFileSync(
    join(checkout, 'masters/v12/verification.json'),
    JSON.stringify({ artifactSHA256: {} }),
  )
  assert.throws(() => checkResume(root), /verification record/)
})

test('explains the local configuration when it is missing', (t) => {
  const { root } = fixture(t)
  rmSync(join(root, configPath))
  assert.throws(() => checkResume(root), /\.local\/resume-source\.json/)
})
