// The anonymous visitor id: a hash of a salt that is random per UTC day, the
// connecting IP and the user agent. Neither input is stored, and once the
// day's salt is deleted the id can't be recomputed from them.
import { utcDay } from './utcDays'

let remembered: { day: string; salt: string } | undefined

const hex = (bytes: Uint8Array): string =>
  [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('')

async function daySalt(db: D1Database, day: string): Promise<string> {
  if (remembered?.day === day) return remembered.salt
  // INSERT OR IGNORE then SELECT, in one batch, so concurrent first visitors
  // of a day all end up reading the same salt.
  const [, read] = await db.batch<{ salt: string }>([
    db
      .prepare('INSERT OR IGNORE INTO salts (day, salt) VALUES (?1, ?2)')
      .bind(day, hex(crypto.getRandomValues(new Uint8Array(16)))),
    db.prepare('SELECT salt FROM salts WHERE day = ?1').bind(day),
  ])
  const salt = read.results[0]?.salt
  if (!salt) throw new Error('Daily salt missing after insert')
  remembered = { day, salt }
  return salt
}

export async function visitorId(
  db: D1Database,
  request: Request,
  now: number,
): Promise<string> {
  const salt = await daySalt(db, utcDay(now))
  const input = [
    salt,
    request.headers.get('cf-connecting-ip') ?? '',
    request.headers.get('user-agent') ?? '',
  ].join('|')
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(input),
  )
  return hex(new Uint8Array(digest).slice(0, 8))
}
