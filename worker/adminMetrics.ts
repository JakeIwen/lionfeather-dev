import {
  metricsRangeDays,
  type MetricsRangeDays,
} from '../src/analytics/analyticsContract'
import type { AdminContext } from './adminContext'
import { errorResponse, jsonResponse } from './jsonResponse'
import { buildMetricsReport } from './metrics'

const defaultDays: MetricsRangeDays = 7

export async function getMetrics({
  env,
  url,
}: AdminContext): Promise<Response> {
  const requested = url.searchParams.get('days')
  const days =
    requested === null
      ? defaultDays
      : metricsRangeDays.find((candidate) => String(candidate) === requested)
  if (days === undefined)
    return errorResponse(
      400,
      `days must be one of ${metricsRangeDays.join(', ')}.`,
    )
  return jsonResponse(await buildMetricsReport(env.DB, days, Date.now()))
}
