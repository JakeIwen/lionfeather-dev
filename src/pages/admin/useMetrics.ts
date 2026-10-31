import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  MetricsRangeDays,
  MetricsReport,
} from '../../analytics/analyticsContract'
import { getMetrics } from './adminClient'

const refreshMs = 60_000

type MetricsState = {
  report: MetricsReport | null
  error: string
  loading: boolean
  updatedAt: number | null
}

/**
 * Loads the report for a range, and reloads it every minute while the tab is
 * visible. Hidden tabs skip the poll and catch up when they become visible.
 */
export function useMetrics(days: MetricsRangeDays) {
  const [state, setState] = useState<MetricsState>({
    report: null,
    error: '',
    loading: true,
    updatedAt: null,
  })
  const latest = useRef(0)
  const lastLoad = useRef(0)

  const load = useCallback(async () => {
    const request = ++latest.current
    lastLoad.current = Date.now()
    setState((previous) => ({ ...previous, loading: true }))
    try {
      const report = await getMetrics(days)
      if (request !== latest.current) return
      setState({ report, error: '', loading: false, updatedAt: Date.now() })
    } catch (error) {
      if (request !== latest.current) return
      setState((previous) => ({
        ...previous,
        loading: false,
        error: error instanceof Error ? error.message : 'Metrics did not load.',
      }))
    }
  }, [days])

  useEffect(() => {
    void load()
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void load()
    }, refreshMs)
    const onVisible = () => {
      if (
        document.visibilityState === 'visible' &&
        Date.now() - lastLoad.current >= refreshMs
      )
        void load()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
      // Drop a response that is still in flight for the old range.
      latest.current++
    }
  }, [load])

  // Show a report only for the range asked for; the previous range is not an answer.
  const report = state.report?.range.days === days ? state.report : null
  return { ...state, report, refresh: load }
}
