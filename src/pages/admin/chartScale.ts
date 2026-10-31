/** Axis values from 0 up to the first multiple of a 1-2-5 step at or above max (at most about four steps). */
export function niceTicks(max: number): number[] {
  if (max <= 0) return [0, 1]
  const rough = max / 4
  const power = 10 ** Math.floor(Math.log10(rough))
  const step = Math.max(
    1,
    [1, 2, 5, 10].map((factor) => factor * power).find((s) => s >= rough) ?? 1,
  )
  const ticks: number[] = []
  for (let value = 0; ; value += step) {
    ticks.push(value)
    if (value >= max) return ticks
  }
}

/** Up to `count` evenly spread indexes into a list of `length`, always including the first and last. */
export function spreadIndexes(length: number, count: number): number[] {
  if (length <= count) return Array.from({ length }, (_, index) => index)
  return Array.from({ length: count }, (_, i) =>
    Math.round((i * (length - 1)) / (count - 1)),
  )
}

export const chartHeight = 220
const pad = { top: 8, right: 8, bottom: 26, left: 40 }
const maxBarWidth = 28

/** Pixel layout for `days` bars in a chart `width` px wide whose tallest bar is `max`. */
export function chartGeometry(days: number, width: number, max: number) {
  const ticks = niceTicks(max)
  const top = ticks[ticks.length - 1]
  const plotW = width - pad.left - pad.right
  const plotH = chartHeight - pad.top - pad.bottom
  const slot = plotW / days
  // A 2px spacer between bars, 1px when they are too thin to spare more.
  const gap = slot > 8 ? 2 : 1
  const barW = Math.max(1, Math.min(slot - gap, maxBarWidth))
  return {
    ticks,
    plotW,
    plotH,
    slot,
    barW,
    innerW: Math.max(1, Math.round(barW / 2)),
    left: pad.left,
    right: width - pad.right,
    top: pad.top,
    baseline: pad.top + plotH,
    y: (value: number) => pad.top + plotH - (value / top) * plotH,
    slotStart: (index: number) => pad.left + slot * index,
    centre: (index: number) => pad.left + slot * (index + 0.5),
  }
}

export type ChartGeometry = ReturnType<typeof chartGeometry>
