import { spawn, spawnSync } from 'node:child_process'
import {
  accessSync,
  closeSync,
  constants,
  existsSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  writeFileSync,
} from 'node:fs'
import { createConnection } from 'node:net'
import { userInfo } from 'node:os'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { setTimeout as pause } from 'node:timers/promises'
import { APP, HEALTH, PORT, ROOT, STOP, readRecord } from './site-server.mjs'

const owner = userInfo()
export const LABEL = `com.${owner.username}.${APP}`
const TARGET = `system/${LABEL}`
const STATE = join(ROOT, '.local/service')
const PAYLOAD = join(STATE, `${LABEL}.plist`)
const INSTALLED = join('/Library/LaunchDaemons', `${LABEL}.plist`)
const ENTRY = join(ROOT, 'scripts/site-server.mjs')
const URL = `http://127.0.0.1:${PORT}`

export function configuration() {
  return {
    Label: LABEL,
    UserName: owner.username,
    ProgramArguments: [
      process.execPath,
      ENTRY,
      '--port',
      String(PORT),
      '--managed',
    ],
    WorkingDirectory: resolve(ROOT),
    EnvironmentVariables: {
      PATH: `${dirname(process.execPath)}:/usr/bin:/bin:/usr/sbin:/sbin`,
      NODE_ENV: 'production',
    },
    RunAtLoad: true,
    KeepAlive: true,
    ThrottleInterval: 10,
    ExitTimeOut: 20,
    ProcessType: 'Background',
    Umask: 0o077,
    StandardOutPath: join(STATE, 'launchd.stdout.log'),
    StandardErrorPath: join(STATE, 'launchd.stderr.log'),
  }
}

const escapeXml = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (character) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&apos;',
      })[character],
  )
function xml(value) {
  if (typeof value === 'boolean') return value ? '<true/>' : '<false/>'
  if (typeof value === 'number') return `<integer>${value}</integer>`
  if (typeof value === 'string') return `<string>${escapeXml(value)}</string>`
  if (Array.isArray(value)) return `<array>${value.map(xml).join('')}</array>`
  return `<dict>${Object.entries(value)
    .map(([key, item]) => `<key>${escapeXml(key)}</key>${xml(item)}`)
    .join('')}</dict>`
}

export function plist(config) {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n<plist version="1.0">${xml(config)}</plist>\n`
}

function command(program, args, privileged = false) {
  const interactive = privileged && process.stdin.isTTY
  const argv = privileged
    ? [...(interactive ? [] : ['-n']), program, ...args]
    : args
  const result = spawnSync(privileged ? '/usr/bin/sudo' : program, argv, {
    encoding: 'utf8',
    stdio: interactive ? 'inherit' : 'pipe',
  })
  if (result.error || result.status !== 0) {
    throw new Error(
      `${basename(program)} ${args.join(' ')} failed: ${result.error?.message || result.stderr?.trim() || result.stdout?.trim() || `exit ${result.status}`}`,
    )
  }
  return result.stdout || ''
}

export function assertOwnedConfiguration(config) {
  const args = config.ProgramArguments
  if (
    config.Label !== LABEL ||
    config.UserName !== owner.username ||
    config.WorkingDirectory !== resolve(ROOT) ||
    !Array.isArray(args) ||
    args[1] !== ENTRY ||
    args[2] !== '--port' ||
    args[3] !== String(PORT) ||
    args[4] !== '--managed'
  ) {
    throw new Error(
      'Refusing to control a service belonging to another workspace or user.',
    )
  }
}

function installedConfiguration() {
  if (!existsSync(INSTALLED)) return null
  if (lstatSync(INSTALLED).isSymbolicLink())
    throw new Error('Refusing a symlinked service plist.')
  const config = JSON.parse(
    command('/usr/bin/plutil', ['-convert', 'json', '-o', '-', INSTALLED]),
  )
  assertOwnedConfiguration(config)
  return config
}

function job() {
  const result = spawnSync('/bin/launchctl', ['print', TARGET], {
    encoding: 'utf8',
  })
  if (result.error) throw result.error
  if (result.status !== 0) {
    if (/Could not find service/.test(result.stderr || ''))
      return { loaded: false }
    throw new Error(
      `Cannot inspect ${TARGET}: ${result.stderr || result.stdout}`,
    )
  }
  const pid = Number(result.stdout.match(/^\s*pid = (\d+)\s*$/m)?.[1]) || null
  return {
    loaded: true,
    pid,
    state: result.stdout.match(/^\s*state = (.+)$/m)?.[1]?.trim(),
  }
}

function enabled() {
  const text = command('/bin/launchctl', ['print-disabled', 'system'])
  const line = text.split('\n').find((line) => line.includes(`"${LABEL}"`))
  return !line || !/=>\s*(?:true|disabled)\s*$/.test(line.trim())
}

function portOpen() {
  return new Promise((done, reject) => {
    const socket = createConnection({ host: '127.0.0.1', port: PORT })
    socket.setTimeout(1500)
    socket.once('connect', () => {
      socket.destroy()
      done(true)
    })
    socket.once('error', (error) =>
      error.code === 'ECONNREFUSED' ? done(false) : reject(error),
    )
    socket.once('timeout', () => {
      socket.destroy()
      reject(new Error(`Port ${PORT} did not respond.`))
    })
  })
}

async function health() {
  try {
    const response = await fetch(URL + HEALTH, {
      signal: AbortSignal.timeout(1500),
    })
    if (!response.ok) return null
    const data = await response.json()
    return data.app === APP ? data : null
  } catch {
    return null
  }
}

export function ownershipMatches(record, live) {
  return Boolean(
    record &&
    live &&
    record.app === APP &&
    live.app === APP &&
    record.root === resolve(ROOT) &&
    record.uid === owner.uid &&
    live.uid === owner.uid &&
    record.port === PORT &&
    live.port === PORT &&
    record.pid === live.pid &&
    record.instance === live.instance &&
    /^[a-f0-9]{64}$/.test(record.token || ''),
  )
}

async function ownedRuntime() {
  const live = await health()
  if (!live) return null
  const record = readRecord(STATE)
  if (!ownershipMatches(record, live))
    throw new Error(
      'HTTP and private ownership records do not match; nothing was stopped.',
    )
  return { record, live }
}

async function assertPortAvailableOrOwned() {
  const runtime = await ownedRuntime()
  if (!runtime && (await portOpen()))
    throw new Error(
      `Port ${PORT} belongs to an unrecognized listener. Nothing was stopped.`,
    )
  return runtime
}

function preflight(requireBuild = true) {
  if (process.platform !== 'darwin')
    throw new Error('This service manager requires macOS.')
  if (process.getuid() === 0)
    throw new Error(
      'Run this controller as your normal user. Do not sudo the whole npm/Node command.',
    )
  accessSync(process.execPath, constants.X_OK)
  if (requireBuild) {
    if (!existsSync(join(ROOT, 'dist/index.html')))
      throw new Error('Build the site first: npm run build')
    if (lstatSync(join(ROOT, 'dist')).isSymbolicLink())
      throw new Error('The build directory must not be a symlink.')
  }
  command('/bin/launchctl', ['print', 'system'])
  installedConfiguration()
}

function prepare() {
  preflight()
  mkdirSync(STATE, { recursive: true, mode: 0o700 })
  writeFileSync(PAYLOAD, plist(configuration()), { mode: 0o600 })
  command('/usr/bin/plutil', ['-lint', PAYLOAD])
  for (const name of ['launchd.stdout.log', 'launchd.stderr.log'])
    closeSync(openSync(join(STATE, name), 'a', 0o600))
  console.log(`Prepared ${PAYLOAD}. This is not an installed service.`)
}

async function stopOwned() {
  const runtime = await ownedRuntime()
  if (!runtime) return null
  const response = await fetch(URL + STOP, {
    method: 'POST',
    headers: { 'X-Lionfeather-Control': runtime.record.token },
    signal: AbortSignal.timeout(3000),
  })
  if (!response.ok)
    throw new Error(`Graceful stop failed (${response.status}).`)
  return runtime.live
}

async function waitForReady({
  managed = true,
  previous = null,
  timeout = 25_000,
} = {}) {
  const deadline = Date.now() + timeout
  while (Date.now() < deadline) {
    const runtime = await ownedRuntime()
    const launch = managed ? job() : null
    if (
      runtime &&
      (!managed ||
        (runtime.live.mode === 'launchd' &&
          launch.loaded &&
          launch.pid === runtime.live.pid)) &&
      (!previous ||
        (runtime.live.pid !== previous.pid &&
          runtime.live.instance !== previous.instance))
    )
      return runtime.live
    await pause(250)
  }
  throw new Error(
    `Site did not become ready. Inspect ${join(STATE, 'launchd.stderr.log')}.`,
  )
}

async function waitForStop(instance) {
  for (let i = 0; i < 24; i++) {
    const live = await health()
    if (!live || live.instance !== instance) return
    await pause(250)
  }
  throw new Error('The previous process did not stop.')
}

async function recoverManual() {
  if (job().loaded || (await portOpen())) return
  const out = openSync(join(STATE, 'launchd.stdout.log'), 'a', 0o600)
  const err = openSync(join(STATE, 'launchd.stderr.log'), 'a', 0o600)
  try {
    const child = spawn(process.execPath, [ENTRY], {
      cwd: ROOT,
      detached: true,
      stdio: ['ignore', out, err],
    })
    child.unref()
    await waitForReady({ managed: false })
    console.error(
      `Restored manual hosting at ${URL}; boot startup is not verified.`,
    )
  } finally {
    closeSync(out)
    closeSync(err)
  }
}

async function install() {
  prepare()
  const previous = await assertPortAvailableOrOwned()
  // Obtain installation authorization before interrupting an existing viewer.
  command(
    '/usr/bin/install',
    ['-o', 'root', '-g', 'wheel', '-m', '644', PAYLOAD, INSTALLED],
    true,
  )
  try {
    command('/bin/launchctl', ['enable', TARGET], true)
    if (job().loaded) command('/bin/launchctl', ['bootout', TARGET], true)
    else if (previous) await stopOwned()
    if (previous) await waitForStop(previous.live.instance)
    command('/bin/launchctl', ['bootstrap', 'system', INSTALLED], true)
    const live = await waitForReady()
    console.log(
      `Installed ${TARGET}; running as ${owner.username}, PID ${live.pid}, ${URL}`,
    )
  } catch (error) {
    if (previous)
      await recoverManual().catch((recovery) => console.error(recovery.message))
    throw error
  }
}

async function status() {
  const config = installedConfiguration()
  const launch = job()
  const runtime = await ownedRuntime()
  const isEnabled = config ? enabled() : false
  const supervised = Boolean(
    config &&
    launch.loaded &&
    isEnabled &&
    runtime &&
    runtime.live.mode === 'launchd' &&
    launch.pid === runtime.live.pid,
  )
  console.log(
    JSON.stringify(
      {
        service: TARGET,
        installed: Boolean(config),
        startupEnabled: isEnabled,
        job: launch,
        serving: Boolean(runtime),
        supervised,
        url: URL,
        process: runtime?.live || null,
        logs: STATE,
      },
      null,
      2,
    ),
  )
  return supervised
}

async function verify() {
  const config = installedConfiguration()
  if (
    !config ||
    !job().loaded ||
    !enabled() ||
    config.RunAtLoad !== true ||
    config.KeepAlive !== true
  )
    throw new Error(
      'Install and enable the boot service before verifying automatic restart.',
    )
  const before = await waitForReady()
  const response = await fetch(URL, { signal: AbortSignal.timeout(3000) })
  const html = await response.text()
  if (!response.ok || !html.includes('Jacob Iwen'))
    throw new Error('Site content verification failed.')
  const assets = [...html.matchAll(/(?:src|href)="(\/assets\/[^\"]+)"/g)].map(
    (match) => match[1],
  )
  if (!assets.some((path) => path.endsWith('.js')))
    throw new Error('Built application script is missing.')
  for (const path of assets) {
    const asset = await fetch(URL + path, { signal: AbortSignal.timeout(3000) })
    if (!asset.ok) throw new Error(`Public asset unavailable: ${path}`)
    await asset.arrayBuffer()
  }
  await stopOwned() // Leave KeepAlive enabled; launchd must replace the process.
  const after = await waitForReady({ previous: before, timeout: 35_000 })
  console.log(
    JSON.stringify(
      {
        verified: true,
        automaticRestart: true,
        service: TARGET,
        oldPid: before.pid,
        newPid: after.pid,
        url: URL,
      },
      null,
      2,
    ),
  )
}

async function control(action) {
  preflight(!['stop', 'uninstall'].includes(action))
  if (!installedConfiguration())
    throw new Error('Service not installed. Run npm run service:install first.')
  const runtime = await assertPortAvailableOrOwned()
  if (action === 'stop' || action === 'uninstall') {
    command('/bin/launchctl', ['disable', TARGET], true)
    if (job().loaded) command('/bin/launchctl', ['bootout', TARGET], true)
    else await stopOwned()
    if (runtime) await waitForStop(runtime.live.instance)
    if (action === 'uninstall') command('/bin/rm', ['--', INSTALLED], true)
    console.log(
      action === 'uninstall'
        ? 'Startup registration removed; project files retained.'
        : 'Stopped; automatic startup stays disabled until service:start.',
    )
    return
  }
  command('/bin/launchctl', ['enable', TARGET], true)
  try {
    if (runtime?.live.mode === 'manual') {
      await stopOwned()
      await waitForStop(runtime.live.instance)
    }
    if (!job().loaded)
      command('/bin/launchctl', ['bootstrap', 'system', INSTALLED], true)
    else
      command(
        '/bin/launchctl',
        action === 'restart'
          ? ['kickstart', '-k', TARGET]
          : ['kickstart', TARGET],
        true,
      )
    const live = await waitForReady({
      previous: action === 'restart' ? runtime?.live : null,
    })
    console.log(`Running ${TARGET}, PID ${live.pid}: ${URL}`)
  } catch (error) {
    if (runtime?.live.mode === 'manual')
      await recoverManual().catch((recovery) => console.error(recovery.message))
    throw error
  }
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    const [action = 'status', ...flags] = process.argv.slice(2)
    if (flags.some((flag) => !['--boot', '--verify'].includes(flag)))
      throw new Error('Supported flags: --boot, --verify')
    if (action === 'prepare') prepare()
    else if (action === 'install') {
      await install()
      if (flags.includes('--verify')) await verify()
    } else if (action === 'status') {
      if (!(await status())) process.exitCode = 1
    } else if (action === 'verify') await verify()
    else if (['start', 'stop', 'restart', 'uninstall'].includes(action))
      await control(action)
    else if (action === 'stop-manual') {
      if (job().loaded)
        throw new Error(
          'Use service:stop for a managed service so KeepAlive is disabled first.',
        )
      const live = await stopOwned()
      if (live) await waitForStop(live.instance)
      console.log('Manual site stopped.')
    } else
      throw new Error(
        'Actions: prepare, install, start, stop, restart, status, verify, uninstall, stop-manual',
      )
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}
