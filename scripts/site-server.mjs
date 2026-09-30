import { createServer } from 'node:http'
import { randomBytes, timingSafeEqual } from 'node:crypto'
import {
  createReadStream,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs'
import { extname, join, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'

export const ROOT = fileURLToPath(new URL('../', import.meta.url))
export const APP = 'lionfeather-org'
export const PORT = 5174
export const HEALTH = '/__lionfeather/health'
export const STOP = '/__lionfeather/stop'
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain; charset=utf-8',
}

export function readRecord(stateDir) {
  try {
    return JSON.parse(readFileSync(join(stateDir, 'server.json'), 'utf8'))
  } catch (error) {
    if (error.code === 'ENOENT') return null
    throw error
  }
}

export function removeOwnRecord(stateDir, instance, pid) {
  const record = readRecord(stateDir)
  if (record?.instance === instance && record.pid === pid)
    unlinkSync(join(stateDir, 'server.json'))
}

function publicFile(root, parts) {
  let path = root
  for (const part of parts) {
    path = join(path, part)
    try {
      if (lstatSync(path).isSymbolicLink()) return null
    } catch (error) {
      if (error.code === 'ENOENT' || error.code === 'ENOTDIR') return null
      throw error
    }
  }
  const real = realpathSync(path)
  return real.startsWith(root + sep) && lstatSync(real).isFile() ? real : null
}

export async function startSiteServer({
  dist = join(ROOT, 'dist'),
  stateDir = join(ROOT, '.local/service'),
  port = PORT,
  managed = false,
} = {}) {
  if (lstatSync(dist).isSymbolicLink())
    throw new Error('The build directory must not be a symlink.')
  const publicRoot = realpathSync(dist)
  if (!publicFile(publicRoot, ['index.html']))
    throw new Error('Build the site first with npm run build.')
  mkdirSync(stateDir, { recursive: true, mode: 0o700 })
  const instance = randomBytes(16).toString('hex')
  const token = randomBytes(32).toString('hex')
  let record
  let closing = false
  let closePromise

  function close() {
    if (closePromise) return closePromise
    closing = true
    closePromise = new Promise((done, reject) => {
      const timeout = setTimeout(() => server.closeAllConnections(), 4000)
      timeout.unref()
      server.close((error) => {
        clearTimeout(timeout)
        try {
          removeOwnRecord(stateDir, instance, process.pid)
        } catch (cleanupError) {
          reject(cleanupError)
          return
        }
        if (error) reject(error)
        else done()
      })
      server.closeIdleConnections()
    })
    return closePromise
  }

  const server = createServer((request, response) => {
    response.setHeader('X-Content-Type-Options', 'nosniff')
    response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
    response.setHeader('Cache-Control', 'no-store')
    const send = (status, body, type = 'text/plain; charset=utf-8') => {
      response.writeHead(status, { 'Content-Type': type })
      response.end(request.method === 'HEAD' ? undefined : body)
    }
    const origin = `http://${request.headers.host}`
    const hosts = [`127.0.0.1:${record?.port}`, `localhost:${record?.port}`]
    if (
      !hosts.includes(request.headers.host) ||
      (request.headers.origin && request.headers.origin !== origin)
    ) {
      send(403, 'Forbidden')
      return
    }
    let pathname
    try {
      pathname = decodeURIComponent((request.url || '/').split('?')[0])
    } catch {
      send(400, 'Invalid path')
      return
    }
    if (pathname === HEALTH && ['GET', 'HEAD'].includes(request.method)) {
      const { token: _token, root: _root, ...health } = record
      send(
        closing ? 503 : 200,
        JSON.stringify(health),
        'application/json; charset=utf-8',
      )
      return
    }
    if (pathname === STOP) {
      if (request.method !== 'POST') {
        send(405, 'POST required')
        return
      }
      const supplied = request.headers['x-lionfeather-control']
      if (
        typeof supplied !== 'string' ||
        !/^[a-f0-9]{64}$/.test(supplied) ||
        !timingSafeEqual(Buffer.from(supplied), Buffer.from(token))
      ) {
        send(403, 'Forbidden')
        return
      }
      response.once('finish', () => {
        void close().catch((error) => console.error(error.message))
      })
      send(
        200,
        JSON.stringify({ stopping: true }),
        'application/json; charset=utf-8',
      )
      return
    }
    if (!['GET', 'HEAD'].includes(request.method)) {
      send(405, 'GET or HEAD required')
      return
    }
    if (closing) {
      send(503, 'Stopping')
      return
    }
    const parts = pathname.split('/').filter(Boolean)
    if (
      !pathname.startsWith('/') ||
      /[\\\0]/.test(pathname) ||
      parts.some((part) => part.startsWith('.'))
    ) {
      send(404, 'Not found')
      return
    }
    try {
      let file = publicFile(publicRoot, parts.length ? parts : ['index.html'])
      // Only extensionless browser navigation gets the SPA fallback. Missing
      // assets and private filenames must stay genuine 404s.
      if (
        !file &&
        !extname(pathname) &&
        !['assets', 'images', '__lionfeather'].includes(parts[0]) &&
        (request.headers.accept || '').includes('text/html')
      ) {
        file = publicFile(publicRoot, ['index.html'])
      }
      if (!file) {
        send(404, 'Not found')
        return
      }
      const type = TYPES[extname(file)]
      if (!type) {
        send(404, 'Not found')
        return
      }
      const stats = lstatSync(file)
      response.setHeader('Content-Type', type)
      response.setHeader('Content-Length', stats.size)
      if (parts[0] === 'assets' && /-[\w-]{8,}\.[a-z0-9]+$/i.test(file)) {
        response.setHeader(
          'Cache-Control',
          'public, max-age=31536000, immutable',
        )
      } else response.setHeader('Cache-Control', 'no-cache')
      if (request.method === 'HEAD') {
        response.end()
        return
      }
      const stream = createReadStream(file)
      stream.on('error', () => {
        if (!response.headersSent) send(500, 'File unavailable')
        else response.destroy()
      })
      response.on('close', () => stream.destroy())
      stream.pipe(response)
    } catch {
      if (!response.headersSent) send(500, 'File unavailable')
      else response.destroy()
    }
  })
  server.requestTimeout = 10_000
  server.headersTimeout = 10_000
  server.on('clientError', (_error, socket) =>
    socket.end('HTTP/1.1 400 Bad Request\r\n\r\n'),
  )
  await new Promise((done, reject) => {
    server.once('error', reject)
    server.listen(port, '127.0.0.1', done)
  })
  record = {
    app: APP,
    pid: process.pid,
    uid: process.getuid?.(),
    port: server.address().port,
    instance,
    mode: managed ? 'launchd' : 'manual',
    startedAt: new Date().toISOString(),
    root: resolve(ROOT),
    token,
  }
  const temporary = join(stateDir, `server-${instance}.tmp`)
  try {
    writeFileSync(temporary, JSON.stringify(record) + '\n', {
      mode: 0o600,
      flag: 'wx',
    })
    renameSync(temporary, join(stateDir, 'server.json'))
  } catch (error) {
    await close()
    if (existsSync(temporary)) unlinkSync(temporary)
    throw error
  }
  return { server, close, record, url: `http://127.0.0.1:${record.port}` }
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    if (process.getuid?.() === 0)
      throw new Error('Run the site as your normal user, not root.')
    const { values } = parseArgs({
      options: {
        port: { type: 'string', default: String(PORT) },
        managed: { type: 'boolean' },
      },
    })
    const port = Number(values.port)
    if (!Number.isInteger(port) || port < 1 || port > 65535)
      throw new Error('Invalid port.')
    const app = await startSiteServer({ port, managed: values.managed })
    console.log(
      `Lionfeather: ${app.url} (${app.record.mode}, PID ${process.pid})`,
    )
    const shutdown = () => {
      void app.close().catch((error) => {
        console.error(error.message)
        process.exitCode = 1
      })
    }
    process.once('SIGTERM', shutdown)
    process.once('SIGINT', shutdown)
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}
