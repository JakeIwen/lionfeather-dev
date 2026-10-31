import { useLayoutEffect, useRef, useState, type RefObject } from 'react'

/**
 * Whether the element's content is wider than the element, kept current as
 * either resizes. `active` is false while the element is not rendered.
 */
export function useOverflowing<T extends HTMLElement>(
  active: boolean,
): [RefObject<T | null>, boolean] {
  const ref = useRef<T>(null)
  const [overflowing, setOverflowing] = useState(false)
  useLayoutEffect(() => {
    const element = ref.current
    if (!active || !element) return
    const check = () =>
      setOverflowing(element.scrollWidth > element.clientWidth)
    check()
    const observer = new ResizeObserver(check)
    observer.observe(element)
    if (element.firstElementChild) observer.observe(element.firstElementChild)
    return () => observer.disconnect()
  }, [active])
  return [ref, overflowing]
}
