// Admin responses are private, so no intermediary or browser may keep them.
export function jsonResponse(body: unknown, status = 200): Response {
  return Response.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  })
}

export const errorResponse = (status: number, error: string): Response =>
  jsonResponse({ error }, status)
