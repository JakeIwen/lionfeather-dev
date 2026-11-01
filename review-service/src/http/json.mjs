// Small JSON helpers for the node:http handlers (no framework: the service has
// two routes, and Express would add a dependency for no gain).
export class HttpError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

export function sendJson(res, status, body, headers = {}) {
  const text = JSON.stringify(body)
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(text),
    'Cache-Control': 'no-store',
    ...headers,
  })
  res.end(text)
}

export async function readJsonBody(req, limitBytes) {
  const tooLarge = () => {
    // Discard the rest of the upload so the client sees our 413, not a reset.
    req.resume()
    return new HttpError(413, 'The request body is too large.')
  }
  if (Number(req.headers['content-length']) > limitBytes) throw tooLarge()
  const chunks = []
  let size = 0
  for await (const chunk of req) {
    size += chunk.length
    if (size > limitBytes) throw tooLarge()
    chunks.push(chunk)
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'))
  } catch {
    throw new HttpError(400, 'The request body must be JSON.')
  }
}
