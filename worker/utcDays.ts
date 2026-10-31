// Analytics days are UTC calendar dates written 'YYYY-MM-DD'.
export const dayMs = 24 * 60 * 60 * 1000

export const utcDay = (ms: number): string =>
  new Date(ms).toISOString().slice(0, 10)

export const addDays = (day: string, days: number): string =>
  utcDay(Date.parse(`${day}T00:00:00Z`) + days * dayMs)

/** Every day from `from` to `to`, inclusive. */
export function daysBetween(from: string, to: string): string[] {
  const days: string[] = []
  for (let day = from; day <= to; day = addDays(day, 1)) days.push(day)
  return days
}
