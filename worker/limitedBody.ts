/**
 * The request body as text, or null when it is larger than `limitBytes`. The
 * stream is cancelled at the limit so an oversized body is never held in full.
 */
export async function readLimitedText(
  request: Request,
  limitBytes: number,
): Promise<string | null> {
  if (Number(request.headers.get('content-length')) > limitBytes) return null
  if (!request.body) return ''
  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    size += value.byteLength
    if (size > limitBytes) {
      await reader.cancel()
      return null
    }
    chunks.push(value)
  }
  const bytes = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  return new TextDecoder().decode(bytes)
}
