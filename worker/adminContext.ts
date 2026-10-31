import type { Env } from './env'

/** What an admin handler gets once the request is known to be the owner's. */
export type AdminContext = {
  request: Request
  env: Env
  url: URL
  email: string
  /** The JSON body, or a thrown BadRequest when it is missing or malformed. */
  json: () => Promise<unknown>
}

/** A request the caller got wrong; becomes a JSON error response. */
export class BadRequest extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message)
  }
}
