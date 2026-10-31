import { Info } from 'lucide-react'
import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import './InfoTip.css'

const margin = 8

/**
 * An info icon with an explanation. Hovering with a mouse shows it; a tap, or
 * Enter and Space on the focused icon, pins it until Escape, a tap elsewhere
 * or a scroll, so it works without hover.
 */
export function InfoTip({
  label,
  children,
}: {
  label: string
  children: string
}) {
  const id = useId()
  const root = useRef<HTMLSpanElement>(null)
  const [hovered, setHovered] = useState(false)
  const [pinned, setPinned] = useState(false)
  const [place, setPlace] = useState<CSSProperties>()
  const open = hovered || pinned

  // Fixed placement keeps the bubble inside the viewport whichever edge the icon sits near.
  useLayoutEffect(() => {
    if (!open || !root.current) return
    const rect = root.current.getBoundingClientRect()
    const width = Math.min(280, window.innerWidth - margin * 2)
    const centered = rect.left + rect.width / 2 - width / 2
    const left = Math.min(
      Math.max(margin, centered),
      window.innerWidth - width - margin,
    )
    setPlace({ top: rect.bottom + 6, left, width })
  }, [open])

  // Escape dismisses the bubble however it was opened.
  useEffect(() => {
    if (!open) return
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setPinned(false)
      setHovered(false)
    }
    document.addEventListener('keydown', escape)
    return () => document.removeEventListener('keydown', escape)
  }, [open])

  // A pinned bubble also closes on a tap elsewhere or a scroll, which would leave it misplaced.
  useEffect(() => {
    if (!pinned) return
    const unpin = () => setPinned(false)
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) unpin()
    }
    document.addEventListener('pointerdown', outside)
    window.addEventListener('scroll', unpin, true)
    return () => {
      document.removeEventListener('pointerdown', outside)
      window.removeEventListener('scroll', unpin, true)
    }
  }, [pinned])

  return (
    <span
      className="info-tip"
      ref={root}
      onPointerEnter={(event) => {
        if (event.pointerType === 'mouse') setHovered(true)
      }}
      onPointerLeave={() => setHovered(false)}
    >
      <button
        type="button"
        className="info-tip-button"
        aria-label={label}
        aria-expanded={pinned}
        aria-describedby={open ? id : undefined}
        onClick={() => setPinned((value) => !value)}
      >
        <Info size={16} aria-hidden="true" />
      </button>
      {open ? (
        <span className="info-tip-bubble" id={id} role="tooltip" style={place}>
          {children}
        </span>
      ) : null}
    </span>
  )
}
