import { useEffect, useId, useRef, useState } from 'react'
import type { MouseEvent } from 'react'

export function useScreenshotViewer() {
  const id = useId()
  const [isOpen, setOpen] = useState(false)
  const opener = useRef<HTMLElement | null>(null)
  const closing = useRef(false)

  useEffect(() => {
    function handleHistory(event: PopStateEvent) {
      closing.current = false
      setOpen(event.state?.screenshotViewer === id)
    }
    window.addEventListener('popstate', handleHistory)
    return () => window.removeEventListener('popstate', handleHistory)
  }, [id])

  function open(event: MouseEvent<HTMLAnchorElement>) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    if (isOpen) return
    opener.current = event.currentTarget
    // Keep the router's location key/index: this is an overlay, not a route.
    window.history.pushState(
      { ...window.history.state, screenshotViewer: id },
      '',
    )
    setOpen(true)
  }

  function close() {
    if (closing.current) return
    if (window.history.state?.screenshotViewer === id) {
      closing.current = true
      window.history.back()
    } else {
      setOpen(false)
    }
  }

  return { isOpen, opener, open, close }
}
