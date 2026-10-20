import { useLayoutEffect, useRef } from 'react'
import type { RefObject } from 'react'

function lockPageScroll() {
  const { body, documentElement: root } = document
  const { scrollX, scrollY } = window
  const bodyStyles = {
    position: body.style.position,
    top: body.style.top,
    left: body.style.left,
    width: body.style.width,
  }
  const overflow = root.style.overflow
  const scrollBehavior = root.style.scrollBehavior
  const restoration = window.history.scrollRestoration
  Object.assign(body.style, {
    position: 'fixed',
    top: `${-scrollY}px`,
    left: `${-scrollX}px`,
    width: '100%',
  })
  root.style.overflow = 'hidden'
  root.style.scrollBehavior = 'auto'
  window.history.scrollRestoration = 'manual'
  const restorePosition = () => {
    window.scrollTo({ left: scrollX, top: scrollY, behavior: 'instant' })
  }
  const unlock = () => {
    Object.assign(body.style, bodyStyles)
    root.style.overflow = overflow
    restorePosition()
    root.style.scrollBehavior = scrollBehavior
    window.history.scrollRestoration = restoration
  }
  return { unlock, restorePosition }
}

export function useViewerDialog(
  isOpen: boolean,
  opener: RefObject<HTMLElement | null>,
) {
  const dialog = useRef<HTMLDialogElement>(null)
  useLayoutEffect(() => {
    const element = dialog.current
    if (!isOpen || !element) return
    const { unlock, restorePosition } = lockPageScroll()
    const url = window.location.href
    const returnTo = opener.current
    element.showModal()
    return () => {
      element.close()
      unlock()
      returnTo?.focus({ preventScroll: true })
      // Hash traversal can restore its own scroll/focus after popstate finishes.
      requestAnimationFrame(() => {
        if (
          !element.isConnected ||
          element.open ||
          window.location.href !== url
        )
          return
        restorePosition()
        returnTo?.focus({ preventScroll: true })
      })
    }
  }, [isOpen, opener])
  return dialog
}
