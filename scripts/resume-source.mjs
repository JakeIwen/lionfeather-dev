import { createHash } from 'node:crypto'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const fail = (message) => {
  throw new Error(message)
}
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex')

// The resume master lives in a private checkout outside this repository. Its
// location is read from an ignored local file so the build and the tracked
// scripts never reference it; only deployment requires it.
export const configPath = '.local/resume-source.json'
export const publicResume = 'public/Jacob-Iwen-Resume.pdf'
const configKeys = ['checkout', 'contentMaster', 'versions']

export function loadConfig(root) {
  const path = join(root, configPath)
  if (!existsSync(path)) {
    fail(
      `Resume source configuration is missing: ${configPath}. Create it with ` +
        `{"checkout": "<resume repository>", "contentMaster": "<Markdown master>", ` +
        `"versions": "<directory of v<N> masters>"}; the last two are relative to the checkout.`,
    )
  }
  const config = JSON.parse(readFileSync(path, 'utf8'))
  for (const key of configKeys) {
    if (typeof config[key] !== 'string' || !config[key])
      fail(`Resume source configuration needs a "${key}" string.`)
  }
  const checkout = resolve(root, config.checkout)
  return {
    checkout,
    contentMaster: join(checkout, config.contentMaster),
    versions: join(checkout, config.versions),
  }
}

const publicPdfs = (directory) =>
  readdirSync(directory).filter((name) => /_public\.pdf$/i.test(name))

// The content master names the version directory it was synchronized to, for
// example "synchronized to source_master_template/v12 on 2026-09-22".
export function currentMaster({ contentMaster, versions }) {
  if (!existsSync(contentMaster))
    fail(`Resume content master not found: ${contentMaster}`)
  const markdown = readFileSync(contentMaster)
  const match = markdown
    .toString('utf8')
    .match(/synchronized to \S*?\b(v\d+)\b/)
  if (!match) fail('The content master does not name its synchronized version.')
  const version = match[1]
  const directory = join(versions, version)
  if (!existsSync(directory))
    fail(`Resume version directory is missing: ${directory}`)
  const snapshot = join(directory, 'resume.md')
  if (existsSync(snapshot) && !readFileSync(snapshot).equals(markdown)) {
    fail(
      `The ${version} snapshot differs from the content master; resolve that in the resume repository first.`,
    )
  }
  const number = Number(version.slice(1))
  const newer = readdirSync(versions, { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isDirectory() &&
        /^v\d+$/.test(entry.name) &&
        Number(entry.name.slice(1)) > number &&
        publicPdfs(join(versions, entry.name)).length,
    )
    .map((entry) => entry.name)
  if (newer.length) {
    fail(
      `Newer public resume versions exist (${newer.join(', ')}) but the content master still names ${version}.`,
    )
  }
  const pdfs = publicPdfs(directory)
  if (pdfs.length !== 1)
    fail(`Expected one public PDF in ${directory}, found ${pdfs.length}.`)
  const pdf = join(directory, pdfs[0])
  const hash = digest(readFileSync(pdf))
  const verification = join(directory, 'verification.json')
  if (!existsSync(verification)) {
    fail(
      `No verification record for ${version}; run the resume repository's checks before publishing it.`,
    )
  }
  const recorded = JSON.parse(readFileSync(verification, 'utf8')).artifactSHA256
  const entry = Object.entries(recorded ?? {}).find(
    ([key]) => key === pdfs[0] || key.endsWith('/' + pdfs[0]),
  )
  if (entry?.[1] !== hash)
    fail(`The ${version} public PDF does not match its verification record.`)
  return { version, pdf, hash }
}

export function checkResume(root, config = loadConfig(root)) {
  const master = currentMaster(config)
  const path = join(root, publicResume)
  if (!existsSync(path)) fail(`Public resume is missing: ${publicResume}`)
  if (digest(readFileSync(path)) !== master.hash) {
    fail(
      [
        `Public resume is out of date: ${publicResume} does not match the ${master.version} public master.`,
        'Review the master PDF text, links, and metadata, then copy it and record the reviewed hash:',
        `  cp '${master.pdf}' ${publicResume}`,
        `  ${master.hash}  (scripts/public-assets.json, public["Jacob-Iwen-Resume.pdf"])`,
      ].join('\n'),
    )
  }
  return master
}
