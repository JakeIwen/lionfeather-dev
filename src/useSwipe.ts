import { useRef } from 'react'
import type { MouseEvent, PointerEvent } from 'react'

export function useSwipe(onSwipe: (direction: number) => void, enabled = true) {
  const start = useRef<{ id: number; x: number; y: number } | null>(null)
  const dragged = useRef(false)

  function onPointerDown(event: PointerEvent<HTMLElement>) {
    dragged.current = false
    if (event.pointerType !== 'touch' || !event.isPrimary) {
      start.current = null
      return
    }
    start.current = { id: event.pointerId, x: event.clientX, y: event.clientY }
  }

  function onPointerMove(event: PointerEvent<HTMLElement>) {
    const origin = start.current
    if (!origin || origin.id !== event.pointerId) return
    if (Math.hypot(event.clientX - origin.x, event.clientY - origin.y) > 10) {
      dragged.current = true
    }
  }

  function onPointerUp(event: PointerEvent<HTMLElement>) {
    const origin = start.current
    start.current = null
    if (!origin || origin.id !== event.pointerId) return
    const x = event.clientX - origin.x
    const y = event.clientY - origin.y
    dragged.current ||= Math.hypot(x, y) > 10
    if (enabled && Math.abs(x) >= 48 && Math.abs(x) > Math.abs(y) * 1.5) {
      onSwipe(x < 0 ? 1 : -1)
    }
  }

  function onClickCapture(event: MouseEvent<HTMLElement>) {
    // A completed drag must not activate an image link or dismiss its viewer.
    if (dragged.current && event.detail !== 0) {
      event.preventDefault()
      event.stopPropagation()
      dragged.current = false
    }
  }

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel: () => {
      start.current = null
      dragged.current = true
    },
    onClickCapture,
  }
}
