import { dayMs, utcDay } from './utcDays'

// Long enough for a year-over-year look at a small site, short of two years.
export const eventRetentionDays = 395

/** Deletes events past retention and salts of days that are already over. */
export async function pruneOldData(db: D1Database, now: number): Promise<void> {
  await db.batch([
    db
      .prepare('DELETE FROM events WHERE ts < ?1')
      .bind(now - eventRetentionDays * dayMs),
    db.prepare('DELETE FROM salts WHERE day < ?1').bind(utcDay(now)),
  ])
}
