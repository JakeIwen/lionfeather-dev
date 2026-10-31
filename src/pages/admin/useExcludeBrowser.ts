import { useEffect, useState } from 'react'
import { excludeBrowserKey } from '../../analytics/analyticsContract'

const excluded = '1'
const counted = '0'

function readFlag(): string | null {
  try {
    return localStorage.getItem(excludeBrowserKey)
  } catch {
    return null
  }
}

function writeFlag(value: string) {
  try {
    localStorage.setItem(excludeBrowserKey, value)
  } catch {
    /* Storage is blocked: the switch still works for this page view only. */
  }
}

/**
 * Whether this browser's visits are kept out of the metrics. The first admin
 * visit in a browser (no saved choice) turns the exclusion on, so the owner's
 * own page views never inflate the numbers; `autoExcluded` says so.
 */
export function useExcludeBrowser() {
  // The read is pure, so a StrictMode double render sees the same first visit.
  const [first] = useState(() => readFlag() === null)
  const [isExcluded, setIsExcluded] = useState(
    () => first || readFlag() === excluded,
  )
  useEffect(() => {
    if (first && readFlag() === null) writeFlag(excluded)
  }, [first])
  const setCounted = (count: boolean) => {
    setIsExcluded(!count)
    writeFlag(count ? counted : excluded)
  }
  return { counted: !isExcluded, setCounted, autoExcluded: first }
}
